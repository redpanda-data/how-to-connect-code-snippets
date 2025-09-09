## Dependencies

In pom.xml add dependencies:

```xml
    <dependencies>
        <dependency>
            <groupId>io.modelcontextprotocol.sdk</groupId>
            <artifactId>mcp</artifactId>
            <version>0.12.1</version>
        </dependency>
    </dependencies>
```

## List tools

Simple example to just list the MCP server's tools.

```java
package org.example;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.client.McpClient;
import io.modelcontextprotocol.client.McpSyncClient;
import io.modelcontextprotocol.client.transport.HttpClientStreamableHttpTransport;
import io.modelcontextprotocol.spec.McpClientTransport;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.Map;

public class McpRemoteClient {

    private static final String OAUTH_URL = "https://auth.prd.cloud.redpanda.com/oauth/token";
    private static final String OAUTH_AUDIENCE = "cloudv2-production.redpanda.cloud";
    private static final ObjectMapper objectMapper = new ObjectMapper();

    public static void main(String[] args) throws Exception {
        String baseUrl = "<mcp-server-url>";
        String clientId = System.getenv("REDPANDA_CLOUD_CLIENT_ID");
        String clientSecret = System.getenv("REDPANDA_CLOUD_CLIENT_SECRET");

        if (clientId == null || clientSecret == null) {
            throw new IllegalArgumentException("REDPANDA_CLOUD_CLIENT_ID and REDPANDA_CLOUD_CLIENT_SECRET must be set");
        }

        // Get OAuth token
        String accessToken = getOAuthToken(clientId, clientSecret);
        System.out.println("Obtained access token");

        // Connect to MCP server
        McpClientTransport transport = HttpClientStreamableHttpTransport.builder(baseUrl)
                .customizeRequest(requestBuilder ->
                        requestBuilder.header("Authorization", "Bearer " + accessToken))
                .build();

        McpSyncClient client = McpClient.sync(transport).build();
        client.initialize();

        // List available tools
        var tools = client.listTools();
        System.out.println("Available tools:");
        tools.tools().forEach(tool ->
                System.out.println("- " + tool.name() + ": " + tool.description()));

        client.closeGracefully();
    }

    private static String getOAuthToken(String clientId, String clientSecret) throws Exception {
        HttpClient client = HttpClient.newHttpClient();

        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("client_id", clientId);
        requestBody.put("client_secret", clientSecret);
        requestBody.put("audience", OAUTH_AUDIENCE);
        requestBody.put("grant_type", "client_credentials");

        String requestBodyJson = objectMapper.writeValueAsString(requestBody);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(OAUTH_URL))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBodyJson))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Failed to get OAuth token. Status: " + response.statusCode() + ", Body: " + response.body());
        }

        JsonNode tokenResponse = objectMapper.readTree(response.body());
        return tokenResponse.get("access_token").asText();
    }
}
```
