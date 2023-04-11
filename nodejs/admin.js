var Kafka = require("kafkajs").Kafka;
var redpanda = new Kafka({
    brokers: ["seed-d23d71e4.cgqqgb90of7c8gaoj2ng.fmc.prd.cloud.redpanda.com:9092"],
    sasl: {
        mechanism: "scram-sha-256",
        username: "mo-test-user",
        password: "pIH-ujFs..nUIsyuSh9k&_Zul]0nl("
    }
});
var admin = redpanda.admin();
admin.connect().then(function () {
    admin.createTopics({
        topics: [{
                topic: "demo",
                numPartitions: 1,
                replicationFactor: 1
            }]
    })
        .then(function (resp) {
        resp ? console.log("Created topic") :
            console.log("Failed to create topic");
    })
        .finally(function () { return admin.disconnect(); });
});
