## Dependencies

In go.mod add dependencies:

```go
module a2a-client-example

go 1.24

require (
    github.com/a2aproject/a2a-go v0.3.0
    github.com/go-resty/resty/v2 v2.16.5
)
```

## Send message

Simple example to send a message to a Redpanda AI Agent using the A2A protocol.

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	a2a "github.com/a2aproject/a2a-go"
	"github.com/a2aproject/a2a-go/client"
	"github.com/go-resty/resty/v2"
	"github.com/google/uuid"
)

const (
	OAuthURL      = "https://auth.prd.cloud.redpanda.com/oauth/token"
	OAuthAudience = "cloudv2-production.redpanda.cloud"
)

type OAuthTokenResponse struct {
	AccessToken string `json:"access_token"`
}

func main() {
	agentURL := "<agent-url>"
	clientID := os.Getenv("REDPANDA_CLOUD_CLIENT_ID")
	clientSecret := os.Getenv("REDPANDA_CLOUD_CLIENT_SECRET")

	if clientID == "" || clientSecret == "" {
		log.Fatal("REDPANDA_CLOUD_CLIENT_ID and REDPANDA_CLOUD_CLIENT_SECRET must be set")
	}

	// Get OAuth token
	accessToken, err := getOAuthToken(clientID, clientSecret)
	if err != nil {
		log.Fatalf("Failed to get OAuth token: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Create HTTP client with auth header
	httpClient := &http.Client{
		Transport: &authTransport{
			token: accessToken,
			base:  http.DefaultTransport,
		},
	}

	// Resolve agent card
	agentCard, err := client.ResolveAgentCard(ctx, agentURL, client.WithHTTPClient(httpClient))
	if err != nil {
		log.Fatalf("Failed to resolve agent card: %v", err)
	}

	// Create A2A client
	a2aClient, err := client.NewFromAgentCard(agentCard, client.WithHTTPClient(httpClient))
	if err != nil {
		log.Fatalf("Failed to create A2A client: %v", err)
	}

	// Send message
	message := &a2a.Message{
		Role: "user",
		Parts: []a2a.Part{
			&a2a.TextPart{Kind: "text", Text: "What can you help me with?"},
		},
		MessageID: uuid.New().String(),
	}

	response, err := a2aClient.SendMessage(ctx, message)
	if err != nil {
		log.Fatalf("Failed to send message: %v", err)
	}

	result, _ := json.MarshalIndent(response.Result, "", "  ")
	fmt.Printf("Response: %s\n", result)
}

func getOAuthToken(clientID, clientSecret string) (string, error) {
	restyClient := resty.New()

	var tokenResp OAuthTokenResponse
	resp, err := restyClient.R().
		SetHeader("Content-Type", "application/json").
		SetBody(map[string]string{
			"client_id":     clientID,
			"client_secret": clientSecret,
			"audience":      OAuthAudience,
			"grant_type":    "client_credentials",
		}).
		SetResult(&tokenResp).
		Post(OAuthURL)

	if err != nil {
		return "", fmt.Errorf("HTTP request failed: %w", err)
	}

	if resp.StatusCode() != http.StatusOK {
		return "", fmt.Errorf("OAuth failed with status %d: %s", resp.StatusCode(), resp.String())
	}

	return tokenResp.AccessToken, nil
}

// authTransport adds authorization header to all requests
type authTransport struct {
	token string
	base  http.RoundTripper
}

func (t *authTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	newReq := req.Clone(req.Context())
	newReq.Header.Set("Authorization", "Bearer "+t.token)
	return t.base.RoundTrip(newReq)
}
```
