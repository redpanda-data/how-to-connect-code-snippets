# Java code example


## Prepare the client environment

Download and install a JDK, for example from [openjdk.org](https://openjdk.org/projects/jdk/21/) and Maven from [maven.apache.org](https://maven.apache.org/download.cgi). This example uses the [Apache Kafka](https://github.com/apache/kafka) client library at version 3.6.0.

```bash
# Create and enter the project folder
mkdir redpanda-java; cd redpanda-java
# Initialize the project
mkdir -p src/main/java/org/example
cat > pom.xml <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>org.example</groupId>
    <artifactId>redpanda-client</artifactId>
    <version>1.0-SNAPSHOT</version>

    <properties>
        <!-- 8 or later, eg, 21 is a recent LTS version -->
        <maven.compiler.source>8</maven.compiler.source>
        <maven.compiler.target>8</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.apache.kafka</groupId>
            <artifactId>kafka-clients</artifactId>
            <version>3.6.0</version>
        </dependency>
        <dependency>
            <groupId>org.slf4j</groupId>
            <!-- use slf4j-simple instead to enable client logging -->
            <artifactId>slf4j-nop</artifactId>
            <version>2.0.12</version>
        </dependency>
        <dependency>
            <groupId>org.slf4j</groupId>
            <artifactId>slf4j-api</artifactId>
            <version>2.0.12</version>
        </dependency>
    </dependencies>
    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-shade-plugin</artifactId>
                <version>3.5.1</version>
                <executions>
                    <execution>
                        <phase>package</phase>
                        <goals>
                            <goal>shade</goal>
                        </goals>
                        <configuration>
                            <artifactSet/>
                            <transformers>
                                <transformer implementation="org.apache.maven.plugins.shade.resource.ManifestResourceTransformer">
                                    <mainClass>org.example.Main</mainClass>
                                </transformer>
                                <transformer implementation="org.apache.maven.plugins.shade.resource.ServicesResourceTransformer"/>
                            </transformers>
                            <outputFile>${project.build.directory}/${project.artifactId}-${project.version}-shaded.jar</outputFile>
                        </configuration>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>
EOF
```


## Get credentials
Note the username, password and SASL mechanism for the user to authenticate with. Go to the [Security section](acls) to view existing users or create new users. Ensure that the user has ACLs to create, read and write to a topic named `demo-topic`.


## Create a topic
Create a file named `src/main/java/org/example/Main.java` and paste the code below. In the username and password fields, replace the placeholder text with the actual values. Use the SCRAM mechanism that matches the user to authenticate with.

```java title="Main.java"
package org.example;

import org.apache.kafka.clients.CommonClientConfigs;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.config.SaslConfigs;
import org.apache.kafka.common.errors.TopicExistsException;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.*;
import java.util.concurrent.ExecutionException;

public class Main {
    static Properties clientProperties() {
        // Set up producer and consumer properties
        final String username = "<username>";
        final String password = "<password>";
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "<bootstrap-server-address>");
        props.put(SaslConfigs.SASL_MECHANISM, "<SCRAM-SHA-256 or SCRAM-SHA-512>");
        props.put(SaslConfigs.SASL_JAAS_CONFIG, String.format("org.apache.kafka.common.security.scram.ScramLoginModule required username=\"%s\" password=\"%s\";",
                username, password));
        props.put(CommonClientConfigs.SECURITY_PROTOCOL_CONFIG, "SASL_SSL");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        return props;
    }

    public static void main(String[] args) throws InterruptedException, ExecutionException {
        createTopic("demo-topic");
    }

    static void createTopic(String topicName) throws InterruptedException, ExecutionException {
        try (AdminClient adminClient = AdminClient.create(clientProperties())) {
            adminClient.createTopics(Collections.singleton(new NewTopic(topicName, Optional.of(1), Optional.empty())))
                    .all()
                    .get();
            System.out.println("Created topic");
        } catch (ExecutionException | InterruptedException e) {
            if (!(e.getCause() instanceof TopicExistsException)) {
                throw e;
            }
            System.out.println("Topic already exists");
        }
    }
}
```


## Create a producer to send messages
Create a file named `src/main/java/org/example/Producer.java` and paste the code below.

```java title="Producer.java"
package org.example;

import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerRecord;

import java.util.concurrent.ExecutionException;

public class Producer {
    public static void main(String[] args) {
        produce("demo-topic");
    }

    public static void produce(String topicName) {
        try (org.apache.kafka.clients.producer.Producer<Void, String> producer = new KafkaProducer<>(Main.clientProperties())) {
            for (int i = 0; i < 100; i++) {
                ProducerRecord<Void, String> record = new ProducerRecord<>(topicName, String.format("asynchronous message #%d", i));
                producer.send(record, (r, e) -> {
                    if (e == null) {
                        System.out.printf("Sent to topic '%s' at offset %d\n", r.topic(), r.offset());
                    } else {
                        System.out.println("Error sending message: " + e);
                    }
                });
            }
        }
    }
}
```


## Create a consumer to read data from the topic
Create a file named `src/main/java/org/example/Consumer.java` and paste the code below. Note that the consumer requires slightly more configuration than the producer.

```java title="Consumer.java"
package org.example;

import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.TopicPartition;

import java.time.Duration;
import java.util.*;

public class Consumer {
    public static void main(String[] args) {
        consume("demo-topic");
    }

    public static void consume(String topicName) {
        Properties props = Main.clientProperties();
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");
        try (org.apache.kafka.clients.consumer.Consumer<String, String> consumer = new KafkaConsumer<>(props)) {
            Set<TopicPartition> topicPartitions = Collections.singleton(new TopicPartition(topicName, 0));
            consumer.assign(topicPartitions);
            consumer.seekToBeginning(topicPartitions);
            while (true) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(5));
                if (records.count() == 0) break;
                for (ConsumerRecord<String, String> receivedRecord : records) {
                    System.out.printf("topic: %s (%d|%d), key: %s, %s\n",
                            receivedRecord.topic(), receivedRecord.partition(), receivedRecord.offset(),
                            receivedRecord.key(), receivedRecord.value());
                }
            }
        }
    }
}
```


## Build and run

```bash
# Produce the executable jar file
mvn package
# Create the topic
java -jar target/redpanda-client-1.0-SNAPSHOT-shaded.jar
# Produce some data
java -cp target/redpanda-client-1.0-SNAPSHOT-shaded.jar org.example.Producer
# Consume it back
java -cp target/redpanda-client-1.0-SNAPSHOT-shaded.jar org.example.Consumer
```
