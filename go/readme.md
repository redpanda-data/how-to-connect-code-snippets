# Go code example


## Prepare the client environment

Download and install Go from [go.dev](https://go.dev/doc/install). This example uses the [franz-go](https://github.com/twmb/franz-go) library.

```bash
# Create and enter the project folder
mkdir redpanda-go; cd redpanda-go
# Initialize the project
go mod init com/redpanda/example
# Install required dependencies
go get github.com/twmb/franz-go
go get github.com/twmb/franz-go/pkg/kadm
go get github.com/twmb/tlscfg
go get github.com/twmb/franz-go/pkg/sasl/scram@v1.9.0
```


## Get credentials
Note the username, password and SASL mechanism for the user to authenticate with. Go to the [Security section](acls) to view existing users or create new users. Ensure that the user has ACLs to create, read and write to a topic named `demo-topic`.


## Create a topic
Create a file named `admin.go` and paste the code below. In the username and password fields, replace the placeholder text with the actual values. Use the SCRAM mechanism that matches the user to authenticate with.

```go title="admin.go"
package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"github.com/twmb/franz-go/pkg/kadm"
	"github.com/twmb/franz-go/pkg/kgo"
	"github.com/twmb/franz-go/pkg/sasl/scram"
)

func main() {
	topic := "demo-topic"
	seeds := []string{"<bootstrap-server-address>"}
	opts := []kgo.Opt{}
	opts = append(opts,
		kgo.SeedBrokers(seeds...),
	)

	// Initialize public CAs for TLS
	opts = append(opts, kgo.DialTLSConfig(new(tls.Config)))

	// Initializes SASL/SCRAM 256
	opts = append(opts, kgo.SASL(scram.Auth{
		User: "<username>",
		Pass: "<password>",
	}.AsSha256Mechanism()))

	// Initializes SASL/SCRAM 512
	/*
  opts = append(opts, kgo.SASL(scram.Auth{
		User: "<username>",
		Pass: "<password>",
	}.AsSha512Mechanism()))
  */

	client, err := kgo.NewClient(opts...)
	if err != nil {
		panic(err)
	}
	defer client.Close()

	admin := kadm.NewClient(client)
	defer admin.Close()

	ctx := context.Background()
	// Create a topic with a single partition and single replica
	resp, err := admin.CreateTopics(ctx, 1, 1, nil, topic)
	if err != nil {
		panic(err)
	}

	for _, ctr := range resp {
		if ctr.Err != nil {
			fmt.Printf("Unable to create topic '%s': %s", ctr.Topic, ctr.Err)
		} else {
			fmt.Printf("Created topic '%s'", ctr.Topic)
		}
	}
}
```


## Create a producer to send messages
Create a file named `producer.go` and paste the code below. In the username and password fields, replace the placeholder text with the actual values. Use the SCRAM mechanism that matches the user to authenticate with.

```go title="producer.go"
package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"os"
	"sync"

	"github.com/twmb/franz-go/pkg/kgo"
	"github.com/twmb/franz-go/pkg/sasl/scram"
)

func main() {
	topic := "demo-topic"
	hostname, _ := os.Hostname()
	ctx := context.Background()

	seeds := []string{"<bootstrap-server-address>"}
	opts := []kgo.Opt{}
	opts = append(opts,
		kgo.SeedBrokers(seeds...),
	)

	// Initialize public CAs for TLS
	opts = append(opts, kgo.DialTLSConfig(new(tls.Config)))

	// Initializes SASL/SCRAM 256
	opts = append(opts, kgo.SASL(scram.Auth{
		User: "<username>",
		Pass: "<password>",
	}.AsSha256Mechanism()))

	// Initializes SASL/SCRAM 512
	/*
  opts = append(opts, kgo.SASL(scram.Auth{
		User: "<username>",
		Pass: "<password>",
	}.AsSha512Mechanism()))
  */

	client, err := kgo.NewClient(opts...)
	if err != nil {
		panic(err)
	}
	defer client.Close()

	// Produce 100 messages asynchronously
	var wg sync.WaitGroup
	for i := 1; i < 100; i++ {
		wg.Add(1)
		record := &kgo.Record{
			Topic: topic,
			Key:   []byte(hostname),
			Value: []byte(fmt.Sprintf("Message %d", i)),
		}
		client.Produce(ctx, record, func(record *kgo.Record, err error) {
			defer wg.Done()
			if err != nil {
				fmt.Printf("Error sending message: %v \n", err)
			} else {
				fmt.Printf("Message sent: topic: %s, offset: %d, value: %s \n",
					topic, record.Offset, record.Value)
			}
		})
	}
	wg.Wait()

}
```


## Create a consumer to read data from the topic
Create a file named `consumer.go` and paste the code below. In the username and password fields, replace the placeholder text with the actual values. Use the SCRAM mechanism that matches the user to authenticate with.

```go title="consumer.go"
package main

import (
	"context"
	"crypto/tls"
	"fmt"

	"github.com/twmb/franz-go/pkg/kgo"
	"github.com/twmb/franz-go/pkg/sasl/scram"
)

func main() {
	topic := "demo-topic"
	ctx := context.Background()

	seeds := []string{"<bootstrap-server-address>"}
	opts := []kgo.Opt{}
	opts = append(opts,
		kgo.SeedBrokers(seeds...),
		kgo.ConsumeTopics(topic),
		kgo.ConsumeResetOffset(kgo.NewOffset().AtStart()),
	)

	// Initialize public CAs for TLS
	opts = append(opts, kgo.DialTLSConfig(new(tls.Config)))

	// Initializes SASL/SCRAM 256
	opts = append(opts, kgo.SASL(scram.Auth{
		User: "<username>",
		Pass: "<password>",
	}.AsSha256Mechanism()))

	// Initializes SASL/SCRAM 512
	/*
  opts = append(opts, kgo.SASL(scram.Auth{
		User: "<username>",
		Pass: "<password>",
	}.AsSha512Mechanism()))
  */

	client, err := kgo.NewClient(opts...)
	if err != nil {
		panic(err)
	}
	defer client.Close()

	for {
		fetches := client.PollFetches(ctx)
		if errs := fetches.Errors(); len(errs) > 0 {
			// All errors are retried internally when fetching, but non-retriable
			// errors are returned from polls so that users can notice and take
			// action.
			panic(fmt.Sprint(errs))
		}
		iter := fetches.RecordIter()
		for !iter.Done() {
			record := iter.Next()
			topicInfo := fmt.Sprintf("topic: %s (%d|%d)",
				record.Topic, record.Partition, record.Offset)
			messageInfo := fmt.Sprintf("key: %s, Value: %s",
				record.Key, record.Value)
			fmt.Printf("Message consumed: %s, %s \n", topicInfo, messageInfo)
		}
	}
}
```


## Run scripts

```bash
# Create the topic
go run admin.go
# Produce some data
go run producer.go
# Consume it back
go run consumer.go
```
