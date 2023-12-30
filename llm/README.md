1. Setup python virtual environment `python3 -m venv .venv`
2. Activate the virtual environment: `source .venv/bin/activate`
3. Update pip: `python3 -m pip install --upgrade pip`
4. Upgrade modal package: `python3 -m pip install --upgrade modal`
5. Install the requirements: `pip install -r requirements.txt`
6. Setup `modal` secrets with `llm-playground-secrets` https://modal.com/docs/guide/secrets
   - Add `AUTH_TOKEN` key with any value
   - Add `HUGGINGFACE_TOKEN` key value from from huggingface https://huggingface.co/docs/hub/security-tokens
7. Run `modal deploy xxx.py` to deploy endpoint
