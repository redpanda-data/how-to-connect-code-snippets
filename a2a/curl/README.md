## Get access token

First, obtain an OAuth access token using your Redpanda Cloud service account credentials.

```bash
export REDPANDA_CLOUD_CLIENT_ID="your-client-id"
export REDPANDA_CLOUD_CLIENT_SECRET="your-client-secret"

ACCESS_TOKEN=$(curl -s -X POST "https://auth.prd.cloud.redpanda.com/oauth/token" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "'"$REDPANDA_CLOUD_CLIENT_ID"'",
    "client_secret": "'"$REDPANDA_CLOUD_CLIENT_SECRET"'",
    "audience": "cloudv2-production.redpanda.cloud",
    "grant_type": "client_credentials"
  }' | jq -r '.access_token')
```

## Fetch agent card

Discover the agent's capabilities by fetching its agent card.

```bash
AGENT_URL="<agent-url>"

curl -s -X GET "${AGENT_URL}/.well-known/agent-card.json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

## Send message

Send a message to the agent using the A2A JSON-RPC protocol.

```bash
MESSAGE_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
REQUEST_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')

curl -s -X POST "$AGENT_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": "'"$REQUEST_ID"'",
    "method": "message/send",
    "params": {
      "message": {
        "role": "user",
        "parts": [
          {
            "kind": "text",
            "text": "What can you help me with?"
          }
        ],
        "messageId": "'"$MESSAGE_ID"'"
      }
    }
  }' | jq .
```
