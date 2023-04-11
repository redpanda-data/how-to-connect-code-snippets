# Node.js code example


## Prepare the client environment

Download and install Node.js [here](https://nodejs.org/en/download).
This example uses the [KafkaJS](https://kafka.js.org/) library.

```bash
# Create and enter the project folder
mkdir redpanda-node; cd redpanda-node
# Generate package.json (the default values are fine)
npm init
# Install required dependencies
npm i -D typescript
npm i -D @types/node
npm i kafkajs
# Generate tsconfig.json
tsc --init
```

## Get credentials
Note the username and password for the user to authenticate with. Go to the [Security section](../acls) to view existing users or create new users. If creating a new user you must create ACLs to allow ... *what permissions are needed?*


## Create a topic
Create a file named admin.ts and paste the code below. Update the username and password fields.

```javascript title="admin.ts"
const {Kafka} = require("kafkajs")

const redpanda = new Kafka({brokers: ["localhost:9092"]})
const admin = redpanda.admin()

admin.connect().then(() => {
  admin.createTopics({
    topics: [{
      topic: "demo",
      numPartitions: 1,
      replicationFactor: 1
    }]
  })
  .then((resp) => {
    resp ? console.log("Created topic") :
      console.log("Failed to create topic")
  })
  .finally(() => admin.disconnect())
})
```


## Create a producer to send messages
Create a file named producer.py and paste the code below. Update the username and password fields.

```python title="producer.py"
import socket
from kafka import KafkaProducer
from kafka.errors import KafkaError

producer = KafkaProducer(
  bootstrap_servers="<auto insert bootstrap server>",
  security_protocol="SASL_SSL",
  sasl_mechanism="SCRAM-SHA-256",
  sasl_plain_username="<TODO: change this to your user name>",
  sasl_plain_password="<TODO: change this to your user password>",
)
hostname = str.encode(socket.gethostname())

# Produce 100 messages asynchronously
for i in range(100):
  msg = f"message #{i}"
  producer.send(
    "demo",
    key=hostname,
    value=str.encode(msg)
  )
producer.flush()
```


## Create a consumer to read data from the topic
Create a file named consumer.py and paste the code below. Update the username and password fields.

```python title="consumer.py"
from kafka import KafkaConsumer

consumer = KafkaConsumer(
  bootstrap_servers=["<auto insert bootstrap server>"],
  security_protocol="SASL_SSL",
  sasl_mechanism="SCRAM-SHA-256",
  sasl_plain_username="<TODO: change this to your user name>",
  sasl_plain_password="<TODO: change this to your user password>",
  auto_offset_reset="earliest",
  enable_auto_commit=False,
  consumer_timeout_ms=1000
)
consumer.subscribe("demo")

for message in consumer:
  topic_info = f"topic: {message.topic} ({message.partition}|{message.offset})"
  message_info = f"key: {message.key}, {message.value}"
  print(f"{topic_info}, {message_info}")
```


## Run scripts

```bash
# Create the topic
(.env) python3 admin.py
# Produce some data
(.env) python3 producer.py
# Consume it back
(.env) python3 consumer.py
```
