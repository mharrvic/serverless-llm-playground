from typing import Dict

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from modal import Image, Secret, Stub, web_endpoint

auth_scheme = HTTPBearer()


image = Image.debian_slim(python_version="3.10").apt_install("git")

# Let's instantiate and name our [Stub](/docs/guide/apps).
stub = Stub(name="stream-test", image=image)


@stub.function(timeout=600, secret=Secret.from_name("llm-playground-secrets"))
@web_endpoint(method="POST")
def generate(
    payload: Dict[str, str], token: HTTPAuthorizationCredentials = Depends(auth_scheme)
):
    import os
    from itertools import chain

    from fastapi.responses import StreamingResponse

    prompt = payload["prompt"]

    print("token.creds: ", token.credentials)
    print("prompt: ", prompt)
    print(
        "os.environ['AUTH_TOKEN']: ",
        os.environ["AUTH_TOKEN"],
    )

    if token.credentials != os.environ["AUTH_TOKEN"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return StreamingResponse(
        chain(
            ("Loading model. This usually takes around 20s ...\n\n"),
            ("Im Mac the bananananamac ...\n\n"),
        ),
        media_type="text/event-stream",
    )
