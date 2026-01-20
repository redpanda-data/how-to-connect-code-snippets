## Dependencies

In pyproject.toml add dependencies:

```toml
[project]
name = "a2a-client-example"
version = "0.1.0"
requires-python = ">=3.10"
dependencies = [
    "a2a-sdk>=0.3.0",
    "httpx>=0.28.1",
]
```

## Send message

Simple example to send a message to a Redpanda AI Agent using the A2A protocol.

```python
import asyncio
import os
from uuid import uuid4

import httpx
from a2a.client import A2AClient, A2ACardResolver
from a2a.types import SendMessageRequest, MessageSendParams

# Load config
agent_url = '<agent-url>'
client_id = os.getenv("REDPANDA_CLOUD_CLIENT_ID")
client_secret = os.getenv("REDPANDA_CLOUD_CLIENT_SECRET")
oauth_url = "https://auth.prd.cloud.redpanda.com/oauth/token"
oauth_audience = "cloudv2-production.redpanda.cloud"


async def get_oauth_token(httpx_client: httpx.AsyncClient) -> str:
    """Fetch OAuth token from Redpanda Cloud."""
    response = await httpx_client.post(
        oauth_url,
        json={
            "client_id": client_id,
            "client_secret": client_secret,
            "audience": oauth_audience,
            "grant_type": "client_credentials",
        },
    )
    response.raise_for_status()
    return response.json()["access_token"]


async def main():
    if not client_id or not client_secret:
        raise ValueError("REDPANDA_CLOUD_CLIENT_ID and REDPANDA_CLOUD_CLIENT_SECRET must be set")

    async with httpx.AsyncClient() as httpx_client:
        # Get OAuth token
        access_token = await get_oauth_token(httpx_client)

        # Create authenticated HTTP client
        auth_client = httpx.AsyncClient(
            headers={"Authorization": f"Bearer {access_token}"}
        )

        async with auth_client:
            # Resolve agent card and create A2A client
            resolver = A2ACardResolver(httpx_client=auth_client, base_url=agent_url)
            agent_card = await resolver.get_agent_card()
            client = A2AClient(httpx_client=auth_client, agent_card=agent_card)

            # Send message
            request = SendMessageRequest(
                id=str(uuid4()),
                params=MessageSendParams(
                    message={
                        "role": "user",
                        "parts": [{"kind": "text", "text": "What can you help me with?"}],
                        "messageId": uuid4().hex,
                    }
                ),
            )
            response = await client.send_message(request)
            print(f"Response: {response.result}")


if __name__ == "__main__":
    asyncio.run(main())
```
