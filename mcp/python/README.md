## Dependencies

In pyproject.yaml add dependencies:

```
[project]
name = "remote-mcp-example"
version = "0.1.0"
requires-python = ">=3.13"
dependencies = [
    "authlib>=1.6.3",
    "mcp>=1.13.1",
    "openai-agents>=0.2.10",
    "python-dotenv>=1.1.1",
]
```

## List tools

Simple example to just list the MCP server's tools.

```python
import os
import asyncio
from authlib.integrations.httpx_client import AsyncOAuth2Client
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

# Load config
mcp_server_url = '<mcp-server-url>'
client_id = os.getenv("REDPANDA_CLOUD_CLIENT_ID")
client_secret = os.getenv("REDPANDA_CLOUD_CLIENT_SECRET")
oauth_url = "https://auth.prd.cloud.redpanda.com/oauth/token"
oauth_audience = "cloudv2-production.redpanda.cloud"


async def main():
    # Get OAuth token
    async with AsyncOAuth2Client(
        client_id,
        client_secret 
    ) as client:
        token = await client.fetch_token(
            "https://auth.prd.cloud.redpanda.com/oauth/token",
            audience="cloudv2-production.redpanda.cloud"
        )
    
    # Connect to MCP server and list tools
    headers = {"Authorization": f"Bearer {token['access_token']}"}
    async with streamablehttp_client(mcp_server_url, headers=headers) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            for tool in tools.tools:
                print(f"- {tool.name}: {tool.description}")

if __name__ == "__main__":
    asyncio.run(main())
```

## Use Remote MCP in OpenAI Agent SDK

Advanced example to integrate OpenAI Agent SDK with Remote MCP.

```python
import asyncio
import os
from agents import Agent, Runner
from agents.mcp import MCPServerStreamableHttp
from authlib.integrations.httpx_client import AsyncOAuth2Client

# Load config
mcp_url = '<mcp-server-url>'
client_id = os.getenv("REDPANDA_CLOUD_CLIENT_ID")
client_secret = os.getenv("REDPANDA_CLOUD_CLIENT_SECRET")
oauth_url = "https://auth.prd.cloud.redpanda.com/oauth/token"
oauth_audience = "cloudv2-production.redpanda.cloud"


# Get OAuth token
async def get_oauth_token():
    async with AsyncOAuth2Client(
        client_id=client_id, client_secret=client_secret
    ) as client:
        token = await client.fetch_token(oauth_url, audience=oauth_audience)
        return token["access_token"]


async def run_agent(mcp_server):
    agent = Agent(
        name="AI Agent",
        instructions="Use the tools available to answer user requests.",
        mcp_servers=[mcp_server],
        model="gpt-5-mini",
    )

    message = "<Your request>"
    print(f"🤖 Running: {message}")
    result = await Runner.run(starting_agent=agent, input=message)
    print("🚀 AI response:")
    print(result.final_output)


async def main():
    access_token = await get_oauth_token()

    async with MCPServerStreamableHttp(
        name="BTC Price Server",
        params={"url": mcp_url, "headers": {"Authorization": f"Bearer {access_token}"}},
    ) as server:
        await run_agent(server)


if __name__ == "__main__":
    asyncio.run(main())
```
