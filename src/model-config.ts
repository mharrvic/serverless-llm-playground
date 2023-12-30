const MODAL_API_NAME = process.env.NEXT_PUBLIC_MODAL_API_NAME;

export const models = [
  // {
  //   endpoint: `https://${MODAL_API_NAME}--stream-test-generate.modal.run/`,
  //   name: "stream-test-generate",
  // },
  {
    endpoint: `https://${MODAL_API_NAME}--example-falcon-gptq-generate.modal.run/`,
    name: "falcon-40b-instruct",
    link: "https://huggingface.co/TheBloke/falcon-40b-instruct-GPTQ",
  },
  // {
  //   endpoint: `https://${MODAL_API_NAME}--open-llama-generate.modal.run/`,
  //   name: "open-llama",
  //   link: "https://github.com/openlm-research/open_llama",
  // },
  {
    endpoint: `https://${MODAL_API_NAME}--example-vllm-mixtral-completion.modal.run/`,
    name: "mixtral-8x7b-instruct",
    link: "https://huggingface.co/mistralai/Mixtral-8x7B-Instruct-v0.1",
  },
];
