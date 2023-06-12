const MODAL_API_NAME = process.env.NEXT_PUBLIC_MODAL_API_NAME;

export const models = [
  {
    endpoint: `https://${MODAL_API_NAME}--stream-test-generate.modal.run/`,
    name: "stream-test-generate",
  },
  {
    endpoint: `https://${MODAL_API_NAME}--example-falcon-gptq-generate.modal.run/`,
    name: "falcon-40b-instruct",
  },
  {
    endpoint: `https://${MODAL_API_NAME}--open-llama-generate.modal.run/`,
    name: "open-llama",
  },
];
