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
import { ClientFactory, ClientFactoryOptions } from '@a2a-js/sdk/client';

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

// Define an interceptor to add Authorization header
class AuthInterceptor {
  constructor(token) {
    this.token = token;
  }

  async before(args) {
    args.options = {
      ...args.options,
      serviceParameters: {
        ...args.options?.serviceParameters,
        'Authorization': `Bearer ${this.token}`,
      },
    };
  }

  async after() {
    // No-op
  }
}

async function main() {
  if (!clientId || !clientSecret) {
    throw new Error('REDPANDA_CLOUD_CLIENT_ID and REDPANDA_CLOUD_CLIENT_SECRET must be set');
  }

  // Get OAuth token
  const accessToken = await getOAuthToken();

  // Fetch agent card (public, no auth needed)
  const cardResponse = await fetch(`${agentUrl}/.well-known/agent-card.json`);
  const agentCard = await cardResponse.json();

  // Create A2A client with authentication
  const options = ClientFactoryOptions.createFrom(ClientFactoryOptions.default, {
    clientConfig: {
      interceptors: [new AuthInterceptor(accessToken)],
    },
  });
  const factory = new ClientFactory(options);
  const client = await factory.createFromAgentCard(agentCard);

  // Send message
  const response = await client.sendMessage({
    message: {
      role: 'user',
      parts: [{ kind: 'text', text: 'What can you help me with?' }],
      messageId: crypto.randomUUID(),
      kind: 'message',
    },
  });

  console.log('Response:', response);
}

main().catch(console.error);
```
