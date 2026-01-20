## Dependencies

In package.json add dependencies:

```json
{
  "name": "a2a-client-example",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node main.js"
  },
  "dependencies": {
    "@a2a-js/sdk": "latest"
  }
}
```

## Send message

Simple example to send a message to a Redpanda AI Agent using the A2A protocol.

```javascript
import { A2AClient } from '@a2a-js/sdk';

// Load config
const agentUrl = '<agent-url>';
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

  if (!response.ok) {
    throw new Error(`OAuth failed: ${response.status}`);
  }

  const token = await response.json();
  return token.access_token;
}

async function main() {
  if (!clientId || !clientSecret) {
    throw new Error('REDPANDA_CLOUD_CLIENT_ID and REDPANDA_CLOUD_CLIENT_SECRET must be set');
  }

  // Get OAuth token
  const accessToken = await getOAuthToken();

  // Create A2A client from agent URL
  const client = await A2AClient.createFromUrl(agentUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  // Send message
  const response = await client.sendMessage({
    message: {
      role: 'user',
      parts: [{ kind: 'text', text: 'What can you help me with?' }],
      messageId: crypto.randomUUID()
    }
  });

  console.log('Response:', response.result);
}

main().catch(console.error);
```
