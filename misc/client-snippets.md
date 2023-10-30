### cURL

```bash
curl --request POST \
--url 'https://AUTH0_DOMAIN/oauth/token' \
--header 'content-type: application/x-www-form-urlencoded' \
--data grant_type=client_credentials \
--data client_id=<YOUR_CLIENT_ID> \
--data client_secret=<YOUR_CLIENT_SECRET> \
--data audience=API_AUDIENCE
```

### GO

```go title="main.go"
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io/ioutil"
)

func main() {
	url := "https://AUTH0_DOMAIN/oauth/token"
	payload := strings.NewReader("grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&audience=API_AUDIENCE")
	req, _ := http.NewRequest("POST", url, payload)
	req.Header.Add("content-type", "application/x-www-form-urlencoded")
	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := ioutil.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))
}
```

### Python

```python title="get_token.py"
import http.client

conn = http.client.HTTPSConnection("https://AUTH0_DOMAIN")

payload = "{\"client_id\":\"YOUR_CLIENT_ID\",\"client_secret\":\"YOUR_CLIENT_SECRET\",\"audience\":\"API_AUDIENCE\",\"grant_type\":\"client_credentials\"}"

headers = { 'content-type': "application/json" }

conn.request("POST", "/oauth/token", payload, headers)

res = conn.getresponse()
data = res.read()

print(data.decode("utf-8"))
```

### Java

```java title="get_token.java"
HttpResponse<String> response = Unirest.post("https://AUTH0_DOMAIN/oauth/token")
  .header("content-type", "application/json")
  .body("{\"client_id\":\"YOUR_CLIENT_ID\",\"client_secret\":\"YOUR_CLIENT_SECRET\",\"audience\":\"API_AUDIENCE\"\"grant_type\":\"client_credentials\"}")
  .asString();
```
