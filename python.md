# Python Code Example


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

Note the username and password to use for client authentication. Go to the [Security](../acls) page to create a new user, or view existing users. If creating a new user, make sure to create the necessary ACLs for managing a topic named `python-demo-topic` and a consumer group named `python-demo-group`.


## Create a topic
Create a file named `admin.py` and copy and paste the code below. Change the username and password fields as necessary:

```python title="admin.py"
from kafka import KafkaAdminClient
from kafka.admin import NewTopic
from kafka.errors import TopicAlreadyExistsError

admin = KafkaAdminClient(
  bootstrap_servers="<auto insert bootstrap server>",
  security_protocol="SASL_SSL",
  sasl_mechanism="SCRAM-SHA-256",
  sasl_plain_username="<insert your username>",
  sasl_plain_password="<insert your password>",
)

try:
  topic = NewTopic(name="python-demo-topic", num_partitions=1, replication_factor=1)
  admin.create_topics(new_topics=[topic])
  print("Created topic")
except TopicAlreadyExistsError as e:
  print("Topic already exists")
finally:
  admin.close()
```


## Create a producer to send messages
Create a file named `producer.py` and copy and paste the code below. Change the username and password fields as necessary:

```python title="producer.py"
import socket
from kafka import KafkaProducer
from kafka.errors import KafkaError

producer = KafkaProducer(
  bootstrap_servers="<auto insert bootstrap server>",
  security_protocol="SASL_SSL",
  sasl_mechanism="SCRAM-SHA-256",
  sasl_plain_username="<insert your username>",
  sasl_plain_password="<insert your password>",
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
    "python-demo-topic",
    key=hostname,
    value=str.encode(msg)
  )
  future.add_callback(on_success)
  future.add_errback(on_error)
producer.flush()

# Produce 100 messages synchronously
for i in range(100, 200):
  msg = f"synchronous message #{i}"
  future = producer.send(
    "python-demo-topic",
    key=hostname,
    value=str.encode(msg)
  )
  try:
    metadata = future.get(timeout=5)
    print(f"Sent to topic '{metadata.topic}' at offset {metadata.offset}")
  except KafkaError as e:
    print(f"Error sending message: {e}")
    pass
producer.flush()
producer.close()
```


## Create a consumer to read data from the topic
Create a file named `consumer.py` and copy and paste the code below. Change the username and password fields as necessary:

```python title="consumer.py"
from kafka import KafkaConsumer

consumer = KafkaConsumer(
  bootstrap_servers="<auto insert bootstrap server>",
  security_protocol="SASL_SSL",
  sasl_mechanism="SCRAM-SHA-256",
  sasl_plain_username="<insert your username>",
  sasl_plain_password="<insert your password>",
  group_id="python-demo-group",
  auto_offset_reset="earliest",
  enable_auto_commit=False,
  consumer_timeout_ms=10000
)
consumer.subscribe("python-demo-topic")

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
