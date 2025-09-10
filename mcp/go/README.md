## List tools

Simple example to just list the MCP server's tools.

```go
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-resty/resty/v2"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

const (
	OAuthURL      = "https://auth.prd.cloud.redpanda.com/oauth/token"
	OAuthAudience = "cloudv2-production.redpanda.cloud"
)

type OAuthTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

type OAuthRequest struct {
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	Audience     string `json:"audience"`
	GrantType    string `json:"grant_type"`
}

func main() {
	mcpServerURL := "<mcp-server-url>"
	clientID := os.Getenv("REDPANDA_CLOUD_CLIENT_ID")
	clientSecret := os.Getenv("REDPANDA_CLOUD_CLIENT_SECRET")

	if clientID == "" || clientSecret == "" {
		log.Fatal("REDPANDA_CLOUD_CLIENT_ID and REDPANDA_CLOUD_CLIENT_SECRET must be set")
	}

	accessToken, err := getOAuthToken(clientID, clientSecret)
	if err != nil {
		log.Fatalf("Failed to get OAuth token: %v", err)
	}
	fmt.Println("Obtained MCP access token")

	listMCPTools(mcpServerURL, accessToken)
}

func getOAuthToken(clientID, clientSecret string) (string, error) {
	client := resty.New()

	oauthReq := OAuthRequest{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		Audience:     OAuthAudience,
		GrantType:    "client_credentials",
	}

	var tokenResp OAuthTokenResponse
	resp, err := client.R().
		SetHeader("Content-Type", "application/json").
		SetBody(oauthReq).
		SetResult(&tokenResp).
		Post(OAuthURL)

	if err != nil {
		return "", fmt.Errorf("HTTP request failed: %w", err)
	}

	if resp.StatusCode() != http.StatusOK {
		return "", fmt.Errorf("OAuth request failed with status %d: %s", resp.StatusCode(), resp.String())
	}

	return tokenResp.AccessToken, nil
}

func listMCPTools(serverURL, token string) {
	// Create MCP client
	client := mcp.NewClient(&mcp.Implementation{
		Name:    "remote-mcp-test",
		Version: "1.0.0",
	}, nil)

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	fmt.Println("Starting MCP client connection with streamable HTTP transport...")

	// Create a custom HTTP client with authorization header
	httpClient := &http.Client{
		Transport: &authTransport{
			token: token,
			base:  http.DefaultTransport,
		},
	}

	// Create streamable HTTP transport with custom HTTP client
	transport := &mcp.StreamableClientTransport{
		Endpoint:   serverURL,
		HTTPClient: httpClient,
	}

	// Connect to server
	session, err := client.Connect(ctx, transport, nil)
	if err != nil {
		log.Fatalf("Failed to connect to server: %v", err)
	}
	defer session.Close()

	fmt.Println("Successfully connected to MCP server")

	// List available tools
	fmt.Println("Listing available tools...")
	tools, err := session.ListTools(ctx, &mcp.ListToolsParams{})
	if err != nil {
		log.Printf("Failed to list tools: %v", err)
	} else {
		fmt.Printf("Found %d tools:\n", len(tools.Tools))
		for i, tool := range tools.Tools {
			fmt.Printf("  %d. %s - %s\n", i+1, tool.Name, tool.Description)
		}
	}
}

// authTransport is a custom HTTP transport that adds authorization headers
type authTransport struct {
	token string
	base  http.RoundTripper
}

func (t *authTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	// Clone the request to avoid modifying the original
	newReq := req.Clone(req.Context())
	newReq.Header.Set("Authorization", "Bearer "+t.token)
	return t.base.RoundTrip(newReq)
}
```
