const {Kafka} = require("kafkajs")
const redpanda = new Kafka({
  brokers: ["seed-d23d71e4.cgqqgb90of7c8gaoj2ng.fmc.prd.cloud.redpanda.com:9092"],
  sasl: {
    mechanism: "scram-sha-256",
    username: "mo-test-user",
    password: "pIH-ujFs..nUIsyuSh9k&_Zul]0nl("
  }
})
const run = async () => {
  await consumer.connect()
  await consumer.subscribe({
    topic: "demo",
    fromBeginning: true
  })
  await consumer.run({
    eachMessage: async ({topic, partition, message}) => {
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