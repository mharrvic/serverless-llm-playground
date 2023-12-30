# Source: https://modal.com/docs/examples/vllm_inference

# # Fast inference with vLLM (Llama 2 13B)

# In this example, we show how to run basic inference, using [`vLLM`](https://github.com/vllm-project/vllm)
# to take advantage of PagedAttention, which speeds up sequential inferences with optimized key-value caching.
#
# `vLLM` also supports a use case as a FastAPI server which we will explore in a future guide. This example
# walks through setting up an environment that works with `vLLM ` for basic inference.
#
# We are running the Llama 2 13B model here, and you can expect 30 second cold starts and well over 100 tokens/second.
# The larger the batch of prompts, the higher the throughput. For example, with [60 prompts](/docs/guide/ex/vllm_prompts.txt)
# we can produce 24k tokens in 39 seconds, which is around 600 tokens/second.
#
# To run
# [any of the other supported models](https://vllm.readthedocs.io/en/latest/models/supported_models.html),
# simply replace the model name in the download step. You may also need to enable `trust_remote_code` for MPT models (see comment below)..
#
# ## Setup
#
# First we import the components we need from `modal`.

import os
import time
from typing import Dict

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

auth_scheme = HTTPBearer()

from modal import Image, Secret, Stub, gpu, method, web_endpoint

MODEL_DIR = "/model"
BASE_MODEL = "meta-llama/Llama-2-13b-chat-hf"
GPU_CONFIG = gpu.A100()


# ## Define a container image
#
# We want to create a Modal image which has the model weights pre-saved to a directory. The benefit of this
# is that the container no longer has to re-download the model from Huggingface - instead, it will take
# advantage of Modal's internal filesystem for faster cold starts.
#
# ### Download the weights
#
# Since the weights are gated on HuggingFace, we must request access in two places:
# - on the [model card page](https://huggingface.co/meta-llama/Llama-2-13b-chat-hf)
# - accept the license [on the Meta website](https://ai.meta.com/resources/models-and-libraries/llama-downloads/).
#
# Next, [create a HuggingFace access token](https://huggingface.co/settings/tokens).
# To access the token in a Modal function, we can create a secret on the [secrets page](https://modal.com/secrets).
# Now the token will be available via the environment variable named `HUGGINGFACE_TOKEN`. Functions that inject this secret will have access to the environment variable.
#
# We can download the model to a particular directory using the HuggingFace utility function `snapshot_download`.
#
# Tip: avoid using global variables in this function. Changes to code outside this function will not be detected and the download step will not re-run.
def download_model_to_folder():
    from huggingface_hub import snapshot_download
    from transformers.utils import move_cache

    os.makedirs(MODEL_DIR, exist_ok=True)

    snapshot_download(
        BASE_MODEL,
        local_dir=MODEL_DIR,
        ignore_patterns="*.pt",  # Using safetensors
        token=os.environ["HUGGINGFACE_TOKEN"],
    )
    move_cache()


# ### Image definition
# We’ll start from a Dockerhub image recommended by `vLLM`, and use
# run_function to run the function defined above to ensure the weights of
# the model are saved within the container image.

vllm_image = (
    Image.from_registry(
        "nvidia/cuda:12.1.0-base-ubuntu22.04", add_python="3.10"
    )
    .pip_install("vllm==0.2.5", "huggingface_hub==0.19.4", "hf-transfer==0.1.4")
    # Use the barebones hf-transfer package for maximum download speeds. No progress bar, but expect 700MB/s.
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
    .run_function(
        download_model_to_folder,
        secret=Secret.from_name("llm-playground-secrets"),
        timeout=60 * 20,
    )
)

stub = Stub("example-llama2-vllm-inference")


# ## The model class
#
# The inference function is best represented with Modal's [class syntax](/docs/guide/lifecycle-functions) and the `__enter__` method.
# This enables us to load the model into memory just once every time a container starts up, and keep it cached
# on the GPU for each subsequent invocation of the function.
#
# The `vLLM` library allows the code to remain quite clean. There are, however, some
# outstanding issues and performance improvements that we patch here, such as multi-GPU setup and
# suboptimal Ray CPU pinning.
@stub.cls(
    gpu=GPU_CONFIG,
    timeout=60 * 10,
    container_idle_timeout=60 * 10,
    allow_concurrent_inputs=10,
    image=vllm_image,
)
class Model:
    def __enter__(self):
        from vllm.engine.arg_utils import AsyncEngineArgs
        from vllm.engine.async_llm_engine import AsyncLLMEngine

        if GPU_CONFIG.count > 1:
            # Patch issue from https://github.com/vllm-project/vllm/issues/1116
            import ray

            ray.shutdown()
            ray.init(num_gpus=GPU_CONFIG.count)

        engine_args = AsyncEngineArgs(
            model=MODEL_DIR,
            tensor_parallel_size=GPU_CONFIG.count,
            gpu_memory_utilization=0.90,
        )

        self.engine = AsyncLLMEngine.from_engine_args(engine_args)
        self.template = "<s> [INST] {user} [/INST] "

        # Performance improvement from https://github.com/vllm-project/vllm/issues/2073#issuecomment-1853422529
        if GPU_CONFIG.count > 1:
            import subprocess

            RAY_CORE_PIN_OVERRIDE = "cpuid=0 ; for pid in $(ps xo '%p %c' | grep ray:: | awk '{print $1;}') ; do taskset -cp $cpuid $pid ; cpuid=$(($cpuid + 1)) ; done"
            subprocess.call(RAY_CORE_PIN_OVERRIDE, shell=True)

    @method()
    async def completion_stream(self, user_question):
        from vllm import SamplingParams
        from vllm.utils import random_uuid

        sampling_params = SamplingParams(
            temperature=0.75,
            max_tokens=1024,
            repetition_penalty=1.1,
        )

        t0 = time.time()
        request_id = random_uuid()
        result_generator = self.engine.generate(
            self.template.format(user=user_question),
            sampling_params,
            request_id,
        )
        index, num_tokens = 0, 0
        async for output in result_generator:
            if (
                output.outputs[0].text
                and "\ufffd" == output.outputs[0].text[-1]
            ):
                continue
            text_delta = output.outputs[0].text[index:]
            index = len(output.outputs[0].text)
            num_tokens = len(output.outputs[0].token_ids)

            yield text_delta

        print(f"Generated {num_tokens} tokens in {time.time() - t0:.2f}s")


# ## Run the model
# We define a [`local_entrypoint`](/docs/guide/apps#entrypoints-for-ephemeral-apps) to call our remote function
# sequentially for a list of inputs. You can run this locally with `modal run -q mistral_vllm.py`. The `q` flag
# enables the text to stream in your local terminal.
@stub.local_entrypoint()
def main():
    model = Model()
    questions = [
        # Coding questions
        "Implement a Python function to compute the Fibonacci numbers.",
        # Literature
        "What is the fable involving a fox and grapes?",
        # Thoughtfulness
        "Describe the city of the future, considering advances in technology, environmental changes, and societal shifts.",
        # Math
        "Think through this step by step. Solve the following system of linear equations: 3x + 2y = 14, 5x - y = 15.",
        # Facts
        "Who was Emperor Norton I, and what was his significance in San Francisco's history?"
    ]
    for question in questions:
        print("Sending new request:", question)
        for text in model.completion_stream.remote_gen(question):
            print(text, end="", flush=True)


@stub.function(
    keep_warm=1,
    allow_concurrent_inputs=10,
    timeout=60 * 10,
    secret=Secret.from_name("llm-playground-secrets")
)
@web_endpoint(method="POST")
async def completion(payload: Dict[str, str], token: HTTPAuthorizationCredentials = Depends(auth_scheme)):
    from urllib.parse import unquote

    from fastapi.responses import StreamingResponse

    prompt = payload["prompt"]

    if token.credentials != os.environ["AUTH_TOKEN"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    async def generate():
        async for text in Model().completion_stream.remote_gen.aio(
            unquote(prompt)
        ):
            yield text

    return StreamingResponse(generate(), media_type="text/event-stream")


@stub.function(
    keep_warm=1,
    allow_concurrent_inputs=10,
    timeout=60 * 10,
)
@web_endpoint()
async def stats(token: HTTPAuthorizationCredentials = Depends(auth_scheme)):
    stats = await Model().completion_stream.get_current_stats.aio()
    return {
        "backlog": stats.backlog,
        "num_total_runners": stats.num_total_runners,
        "model": BASE_MODEL + " (vLLM)",
    }
