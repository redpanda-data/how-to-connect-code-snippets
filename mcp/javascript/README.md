## Dependencies

In package.json add dependencies:

```json
{
  "name": "remote-mcp-javascript-example",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node main.js",
    "openai": "node openai_agent.js",
    "direct": "node direct_mcp.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "@openai/agents": "^0.1.0",
    "dotenv": "^16.0.0"
  }
}
```

## List tools

Simple example to just list the MCP server's tools.

```javascript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import dotenv from 'dotenv';

// Load config
const mcpServerUrl = '<mcp-server-url>';
const clientId = process.env.REDPANDA_CLOUD_CLIENT_ID;
const clientSecret = process.env.REDPANDA_CLOUD_CLIENT_SECRET;
const oauthUrl = 'https://auth.prd.cloud.redpanda.com/oauth/token';
const oauthAudience = 'cloudv2-production.redpanda.cloud';

async function main() {
  // Get OAuth token
  const response = await fetch(oauthUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.REDPANDA_CLOUD_CLIENT_ID,
      client_secret: process.env.REDPANDA_CLOUD_CLIENT_SECRET,
      audience: oauthAudience,
      grant_type: 'client_credentials'
    })
  });
  const token = await response.json();

  // Connect to MCP server and list tools
  const transport = new StreamableHTTPClientTransport(new URL(mcpServerUrl), {
    requestInit: { headers: { 'Authorization': `Bearer ${token.access_token}` } }
  });

  const client = new Client({ name: "MCP-Client", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport);
  
  const tools = await client.listTools();
  tools.tools.forEach(tool => console.log(`- ${tool.name}: ${tool.description}`));
  
  await client.close();
}

main().catch(console.error);
```

## Use Remote MCP in OpenAI Agent SDK

Advanced example to integrate OpenAI Agent SDK with Remote MCP.

```javascript
import { Agent, run, MCPServerStreamableHttp, withTrace } from '@openai/agents';
import dotenv from 'dotenv';

// Load config
const mcpServerUrl = '<mcp-server-url>';
const clientId = process.env.REDPANDA_CLOUD_CLIENT_ID;
const clientSecret = process.env.REDPANDA_CLOUD_CLIENT_SECRET;
const oauthUrl = 'https://auth.prd.cloud.redpanda.com/oauth/token';
const oauthAudience = 'cloudv2-production.redpanda.cloud';

async function getOAuthToken() {
  const response = await fetch(oauthUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      audience: oauthAudience,
      grant_type: 'client_credentials'
    })
  });
  const token = await response.json();
  return token.access_token;
}

async function main() {
  const accessToken = await getOAuthToken();
  
  const mcpServer = new MCPServerStreamableHttp({
    url: mcpServerUrl,
    name: 'BTC Price Server',
    requestInit: {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  });
  
  const agent = new Agent({
    name: 'BTC-Analyst',
    instructions: 'Use the tools to get Bitcoin price data and provide analysis.',
    mcpServers: [mcpServer]
  });

  try {
    await withTrace('BTC Analysis', async () => {
      await mcpServer.connect();
      const result = await run(
        agent,
        'Get the latest 90 days of BTC prices in USD and provide a brief trend analysis.'
      );
      console.log('🚀 AI Analysis:');
      console.log(result.finalOutput);
    });
  } finally {
    await mcpServer.close();
  }
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
```
