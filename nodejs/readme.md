# Node.js code example


## Prepare the client environment

Download and install Node.js [here](https://nodejs.org/en/download). This example uses the [KafkaJS](https://kafka.js.org/) library.

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
Note the username, password and SASL mechanism for the user to authenticate with. Go to the [Security section](acls) to view existing users or create new users. Ensure that the user has ACLs to create, read and write to a topic named `demo-topic`.


## Create a topic
Create a file named `admin.ts` and copy and paste the code below. Change the sasl mechanism, username and password fields as necessary:

```javascript title="admin.ts"
const {Kafka} = require("kafkajs")

const redpanda = new Kafka({
  brokers: ["<bootstrap-server-address>"],
  ssl: {},
  sasl: {
    mechanism: "<scram-sha-256 or scram-sha-512>",
    username: "<username>",
    password: "<password>"
  }
})
const admin = redpanda.admin()

admin.connect().then(() => {
  admin.createTopics({
    topics: [{
      topic: "demo-topic",
      numPartitions: 1,
      replicationFactor: 1
    }]
  })
  .then((resp: any) => {
    resp ? console.log("Created topic") :
      console.log("Failed to create topic")
  })
  .finally(() => admin.disconnect())
})

```


## Create a producer to send messages

Create a file named `producer.ts` and paste the code below. Change the sasl mechanism, username and password fields as necessary:

```javascript title="producer.ts"
const os = require("os")
const {Kafka, CompressionTypes} = require("kafkajs")

const redpanda = new Kafka({
  brokers: ["<bootstrap-server-address>"],
  ssl: {},
  sasl: {
    mechanism: "<scram-sha-256 or scram-sha-512>",
    username: "<username>",
    password: "<password>"
  }
})
const producer = redpanda.producer()

const sendMessage = (msg: string) => {
  return producer.send({
    topic: "demo-topic",
    compression: CompressionTypes.GZIP,
    messages: [{
      // Messages with the same key are sent to the same topic partition for
      // guaranteed ordering
      key: os.hostname(),
      value: JSON.stringify(msg)
    }]
  })
  .catch((e: { message: any }) => {
    console.error(`Unable to send message: ${e.message}`, e)
  })
}

const run = async () => {
  await producer.connect()
  for (let i = 0; i < 100; i++) {
    sendMessage(`message ${i}`).then((resp) => {
      console.log(`Message sent: ${JSON.stringify(resp)}`)
    })
  }
}

run().catch(console.error)

process.once("SIGINT", async () => {
  try {
    await producer.disconnect()
    console.log("Producer disconnected")
  } finally {
    process.kill(process.pid, "SIGINT")
  }
})
```


## Create a consumer to read data from the topic

Create a file named `consumer.ts` and copy and paste the code below. Change the sasl mechanism, username and password fields as necessary:

```javascript title="consumer.ts"
const {Kafka} = require("kafkajs")

const redpanda = new Kafka({
  brokers: ["<bootstrap-server-address>"],
  ssl: {},
  sasl: {
    mechanism: "<scram-sha-256 or scram-sha-512>",
    username: "<username>",
    password: "<password>"
  }
})
const consumer = redpanda.consumer()

const run = async () => {
  await consumer.connect()
  await consumer.subscribe({
    topic: "demo-topic",
    fromBeginning: true
  })
  await consumer.run({
    eachMessage: async ({topic, partition, message}: {topic:string, partition:number, message:any}) => {
      const topicInfo = `topic: ${topic} (${partition}|${message.offset})`
      const messageInfo = `key: ${message.key}, value: ${message.value}`
      console.log(`Message consumed: ${topicInfo}, ${messageInfo}`)
    },
  })
}

run().catch(console.error)

process.once("SIGINT", async () => {
  try {
    await consumer.disconnect()
    console.log("Consumer disconnected")
  } finally {
    process.kill(process.pid, "SIGINT")
  }
})
```

## Run scripts

```bash
# Create the topic
tsc admin.ts && node admin.js
# Produce some data
tsc producer.ts && node producer.js
# Consume it back
tsc consumer.ts && node consumer.js
```
