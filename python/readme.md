# Python code example


## Prepare the client environment

Download and install Python 3 from [python.org](https://www.python.org/downloads). This example uses the [kafka-python](https://kafka-python.readthedocs.io/en/master/) library.

```bash
# Create and enter the project folder
mkdir redpanda-python; cd redpanda-python
# Create virtual environment
python3 -m venv .env
source .env/bin/activate
# Install dependencies
(.env) pip install --upgrade pip
(.env) pip install kafka-python
```


## Get credentials
Note the username, password and SASL mechanism for the user to authenticate with. Go to the [Security section](acls) to view existing users or create new users. Ensure that the user has ACLs to create, read and write to a topic named `demo-topic`.


## Create a topic
Create a file named `admin.py` and paste the code below. In the username, password and sasl_mechanism fields, replace the placeholder text with the actual values.

```python title="admin.py"
from kafka import KafkaAdminClient
from kafka.admin import NewTopic
from kafka.errors import TopicAlreadyExistsError

admin = KafkaAdminClient(
  bootstrap_servers="<bootstrap-server-address>",
  security_protocol="SASL_SSL",
  sasl_mechanism="<SCRAM-SHA-256 or SCRAM-SHA-512>",
  sasl_plain_username="<username>",
  sasl_plain_password="<password>",
)

try:
  topic = NewTopic(name="demo-topic", num_partitions=1, replication_factor=1)
  admin.create_topics(new_topics=[topic])
  print("Created topic")
except TopicAlreadyExistsError as e:
  print("Topic already exists")
finally:
  admin.close()
```


## Create a producer to send messages
Create a file named `producer.py` and paste the code below. In the username, password and sasl_mechanism fields, replace the placeholder text with the actual values.

```python title="producer.py"
import socket
from kafka import KafkaProducer
from kafka.errors import KafkaError

producer = KafkaProducer(
  bootstrap_servers="<bootstrap-server-address>",
  security_protocol="SASL_SSL",
  sasl_mechanism="<SCRAM-SHA-256 or SCRAM-SHA-512>",
  sasl_plain_username="<username>",
  sasl_plain_password="<password>",
)
hostname = str.encode(socket.gethostname())

def on_success(metadata):
  print(f"Sent to topic '{metadata.topic}' at offset {metadata.offset}")

def on_error(e):
  print(f"Error sending message: {e}")

# Produce 100 messages asynchronously
for i in range(100):
  msg = f"asynchronous message #{i}"
  future = producer.send(
    "demo-topic",
    key=hostname,
    value=str.encode(msg)
  )
  future.add_callback(on_success)
  future.add_errback(on_error)
producer.flush()
producer.close()
```


## Create a consumer to read data from the topic
Create a file named `consumer.py` and paste the code below. In the username, password and sasl_mechanism fields, replace the placeholder text with the actual values.

```python title="consumer.py"
from kafka import KafkaConsumer

consumer = KafkaConsumer(
  bootstrap_servers="<bootstrap-server-address>",
  security_protocol="SASL_SSL",
  sasl_mechanism="<SCRAM-SHA-256 or SCRAM-SHA-512>",
  sasl_plain_username="<username>",
  sasl_plain_password="<password>",
  auto_offset_reset="earliest",
  enable_auto_commit=False,
  consumer_timeout_ms=10000
)
consumer.subscribe("demo-topic")

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
# Consume the data
(.env) python3 consumer.py
```
