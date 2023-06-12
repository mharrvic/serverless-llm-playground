# ---
# integration-test: false
# ---
# # Run OpenLLaMa on an A100 GPU

# In this example, we run [OpenLLaMa](https://github.com/openlm-research/open_llama),
# an open-source large language model, using HuggingFace's [transformers](https://huggingface.co/docs/transformers/index)
# library.
#
# ## Setup
#
# First we import the components we need from `modal`.
from typing import Dict

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from modal import Image, Secret, Stub, gpu, method, web_endpoint

auth_scheme = HTTPBearer()

# ## Define a container image
#
# To take advantage of Modal's blazing fast cold-start times, we'll need to download our model weights
# inside our container image.
#
# To do this, we have to define a function that loads both the model and tokenizer using
# [from_pretrained](https://huggingface.co/docs/transformers/main_classes/model#transformers.PreTrainedModel.from_pretrained).
# Since HuggingFace stores this model into a local cache, when Modal snapshots the image after running this function,
# the model weights will be saved and available for use when the container starts up next time.


BASE_MODEL = "openlm-research/open_llama_7b_400bt_preview"


def download_models():
    from transformers import LlamaForCausalLM, LlamaTokenizer

    LlamaForCausalLM.from_pretrained(BASE_MODEL)
    LlamaTokenizer.from_pretrained(BASE_MODEL)


# Now, we define our image. We'll use the `debian-slim` base image, and install the dependencies we need
# using [`pip_install`](/docs/reference/modal.Image#pip_install). At the end, we'll use
# [`run_function`](/docs/guide/custom-container#running-a-function-as-a-build-step-beta) to run the
# function defined above as part of the image build.

image = (
    # Python 3.11+ not yet supported for torch.compile
    Image.debian_slim(python_version="3.10")
    .pip_install(
        "accelerate~=0.18.0",
        "transformers~=4.28.1",
        "torch~=2.0.0",
        "sentencepiece~=0.1.97",
    )
    .run_function(download_models)
)

# Let's instantiate and name our [Stub](/docs/guide/apps).

stub = Stub(name="open-llama", image=image)


# ## The model class
#
# Next, we write the model code. We want Modal to load the model into memory just once every time a container starts up,
# so we use [class syntax](/docs/guide/lifecycle-functions) and the `__enter__` method.
#
# Within the [@stub.cls](/docs/reference/modal.Stub#cls) decorator, we use the [gpu parameter](/docs/guide/gpu)
# to specify that we want to run our function on an [A100 GPU with 20 GB of VRAM](/pricing).
#
# The rest is just using the [generate](https://huggingface.co/docs/transformers/en/main_classes/text_generation#transformers.GenerationMixin.generate) function
# from the `transformers` library. Refer to the documentation for more parameters and tuning.


@stub.cls(gpu=gpu.A100(memory=20))
class OpenLlamaModel:
    def __enter__(self):
        import torch
        from transformers import LlamaForCausalLM, LlamaTokenizer

        self.tokenizer = LlamaTokenizer.from_pretrained(BASE_MODEL)

        model = LlamaForCausalLM.from_pretrained(
            BASE_MODEL,
            torch_dtype=torch.float16,
            device_map="auto",
        )

        self.tokenizer.bos_token_id = 1

        model.eval()
        self.model = torch.compile(model)
        self.device = "cuda"

    @method()
    def generate(
        self,
        input,
        max_new_tokens=128,
        **kwargs,
    ):
        import torch
        from transformers import GenerationConfig

        inputs = self.tokenizer(input, return_tensors="pt")
        input_ids = inputs["input_ids"].to(self.device)

        generation_config = GenerationConfig(**kwargs)
        with torch.no_grad():
            generation_output = self.model.generate(
                input_ids=input_ids,
                generation_config=generation_config,
                return_dict_in_generate=True,
                output_scores=True,
                max_new_tokens=max_new_tokens,
            )
        s = generation_output.sequences[0]
        output = self.tokenizer.decode(s)
        return output
        print(f"\033[96m{input}\033[0m")
        print(output.split(input)[1].strip())


# ## Run the model
# Finally, we define a [`local_entrypoint`](/docs/guide/apps#entrypoints-for-ephemeral-apps) to call our remote function
# sequentially for a list of inputs. You can run this locally with `modal run openllama.py`.
prompt_template = (
    "A chat between a curious human user and an artificial intelligence assistant. The assistant give a helpful, detailed, and accurate answer to the user's question. Return your answer in markdown format."
    "\n\nUser:\n{}\n\nAssistant:\n"
)


@stub.local_entrypoint()
def main():
    input = "How to be good at anything"
    model = OpenLlamaModel()
    model.generate.call(
        input=prompt_template.format(input),
        top_p=0.75,
        top_k=40,
        num_beams=1,
        temperature=0.1,
        do_sample=True,
    )


@stub.function(timeout=600, secret=Secret.from_name("llm-playground-secrets"))
@web_endpoint(method="POST")
def generate(
    payload: Dict[str, str], token: HTTPAuthorizationCredentials = Depends(auth_scheme)
):
    import os
    from itertools import chain

    from fastapi.responses import StreamingResponse

    prompt = payload["prompt"]

    if token.credentials != os.environ["AUTH_TOKEN"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    model = OpenLlamaModel()
    return StreamingResponse(
        chain(
            ("Loading model. This usually takes around 20s ...\n\n"),
            model.generate.call(
                input=prompt_template.format(prompt),
                top_p=0.75,
                top_k=40,
                num_beams=1,
                temperature=0.1,
                do_sample=True,
            ),
        ),
        media_type="text/event-stream",
    )


# ## Next steps
# The above is a simple example of how to run a basic model. Note that OpenLLaMa has not been fine-tuned on an instruction-following dataset,
# so the results aren't amazing out of the box. Refer to [DoppelBot, our Slack fine-tuning demo](https://github.com/modal-labs/doppel-bot) for how
# you could use OpenLLaMa to perform a more useful downstream task.
#
# If you're looking for useful responses out-of-the-box like ChatGPT, you could try Vicuna-13B, which is larger and has been instruction-tuned.
# However, note that this model is not permissively licensed due to the dataset it was trained on. Refer to our [LLM voice chat](/docs/guide/llm-voice-chat)
# post for how to build a complete voice chat app using Vicuna, or go straight to the [file](https://github.com/modal-labs/quillman/blob/main/src/llm_vicuna.py)
# if you want to run it by itself.
