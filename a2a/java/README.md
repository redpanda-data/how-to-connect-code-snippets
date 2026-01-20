## Dependencies

In pom.xml add dependencies:

```xml
    <dependencies>
        <dependency>
            <groupId>io.a2aproject</groupId>
            <artifactId>a2a-java-sdk-client</artifactId>
            <version>0.3.0</version>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
            <version>2.17.0</version>
        </dependency>
    </dependencies>
```

## Send message

Simple example to send a message to a Redpanda AI Agent using the A2A protocol.

```java
package org.example;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.a2aproject.client.A2AClient;
import io.a2aproject.client.A2ACardResolver;
import io.a2aproject.spec.AgentCard;
import io.a2aproject.types.Message;
import io.a2aproject.types.Part;
import io.a2aproject.types.SendMessageRequest;
import io.a2aproject.types.SendMessageResponse;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class A2AClientExample {

    private static final String OAUTH_URL = "https://auth.prd.cloud.redpanda.com/oauth/token";
    private static final String OAUTH_AUDIENCE = "cloudv2-production.redpanda.cloud";
    private static final ObjectMapper objectMapper = new ObjectMapper();

    public static void main(String[] args) throws Exception {
        String agentUrl = "<agent-url>";
        String clientId = System.getenv("REDPANDA_CLOUD_CLIENT_ID");
        String clientSecret = System.getenv("REDPANDA_CLOUD_CLIENT_SECRET");

        if (clientId == null || clientSecret == null) {
            throw new IllegalStateException(
                "REDPANDA_CLOUD_CLIENT_ID and REDPANDA_CLOUD_CLIENT_SECRET must be set"
            );
        }

        // Get OAuth token
        String accessToken = getOAuthToken(clientId, clientSecret);

        // Resolve agent card
        A2ACardResolver resolver = A2ACardResolver.builder()
                .baseUrl(agentUrl)
                .authorizationHeader("Bearer " + accessToken)
                .build();
        AgentCard agentCard = resolver.getAgentCard();

        // Create A2A client
        A2AClient client = A2AClient.builder()
                .agentCard(agentCard)
                .authorizationHeader("Bearer " + accessToken)
                .build();

        // Send message
        Message message = Message.builder()
                .role("user")
                .parts(List.of(Part.text("What can you help me with?")))
                .messageId(UUID.randomUUID().toString())
                .build();

        SendMessageRequest request = SendMessageRequest.builder()
                .id(UUID.randomUUID().toString())
                .message(message)
                .build();

        SendMessageResponse response = client.sendMessage(request);
        System.out.println("Response: " + response.getResult());
    }

    private static String getOAuthToken(String clientId, String clientSecret) throws Exception {
        HttpClient httpClient = HttpClient.newHttpClient();

        String requestBody = objectMapper.writeValueAsString(Map.of(
                "client_id", clientId,
                "client_secret", clientSecret,
                "audience", OAUTH_AUDIENCE,
                "grant_type", "client_credentials"
        ));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(OAUTH_URL))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("OAuth failed: " + response.statusCode());
        }

        JsonNode tokenResponse = objectMapper.readTree(response.body());
        return tokenResponse.get("access_token").asText();
    }
}
```
