# MQTT-MongoDB

This app listens to a topic on the IoT-Hub and saves the received data to the MongoDB database on the WISE-PaaS.

## Quick Start

**STEP 1** Login to WISE-PaaS via command line **`cf login`** with your **domain**, **username** & **password**.

![Imgur](https://i.imgur.com/jngL6ki.png)

**STEP 2** Push the app

    cf push

**NOTE**: This automatically binds to the services in the **manifest.yml**.

If you did not include the service instances in the manifest file, you would need to proceed step 3.

```yml   
---
applications:   
- name: mongodb-mqtt-demo
  memory: 128M
  disk_quota: 128M
  instances: 1
  buildpack: nodejs_buildpack
  health-check-type: http
  timeout: 30
  services:
   - mongodb
   - rabbitmq
```

**STEP 3** Bind the app to the assigned group
    
Bind app to services
    
    cf bs {appName} {serviceInstanceName}

**NOTE**: When you are binding an app to a service, remember to use **service instance name**.

The app start automatically if the push is successful, and the state of your app should be **running**.

If you bind your app manually, you would need to restart your app **`cf restage {appName}`**.

Paste your route on a browser to check your results.

You should get this:

![Imgur](https://i.imgur.com/VgcSrEP.png)

Under the home route, you would get some text.

And under the "/hbts" route, you would see the data queried from the database. 

If you don't have any data yet, you would just see an empty array.

## Code description

#### Part 1. Get variables of MongoDB and connect to database

```js
const vcap_services = JSON.parse(process.env.VCAP_SERVICES);
const replicaSetName = vcap_services['mongodb-innoworks'][0].credentials.replicaSetName;
const db = vcap_services['mongodb-innoworks'][0].credentials.uri + '?replicaSet=' + replicaSetName;

mongoose.connect(db)
  .then(() => console.log('Connected to the MongoDB...'))
  .catch(err => console.log('Could not connect to MongoDB...', err));
```

**NOTE**: **'mongodb-innoworks'** is the service name, not service instance name.
To check service name, please login to WISE-PaaS Management Portal or command line: `cf services`

#### Part 2. Get variables of Rabbitmq

```js
// -- Get env variables for rabbitmq service
const vcapServices = JSON.parse(process.env.VCAP_SERVICES);
const mqttUri = vcapServices['p-rabbitmq'][0].credentials.protocols.mqtt.uri
```

**Note**: Just the same as above, **'p-rabbitmq'** is the service name, not service instance name.
To check service name, please login to WISE-PaaS Management Portal or command line: `cf services`

#### Part 3. Create Schema for the data

```js
const hbtSchema = new mongoose.Schema({
  ts: {
    type: Date,
    default: Date.now
  },
  heartbeat: Number,
  patient: {
    type: String,
    default: 'patient-test'
  }
});

const heartbeat = mongoose.model('heartbeat', hbtSchema);
```

**NOTE**: This part creates the schema of the data.

**NOTE**: Remember to include the entry **'ts'**, which is timestamp. 

This is crucial for future work, so that we could set up the MongoDB data source for WISE-PaaS Dashboard. 

#### Part 4. Subscribe to a topic and listen

```js
const client = mqtt.connect(mqttUri);

// Subscribe
client.on('connect', (connack) => {
  client.subscribe('ward/heartbeat', (err, granted) => {
    if (err) console.log(err);

    console.log('@' + formatTime() + ' -- Subscribed to the topic: ward/heartbeat');
  });
});

// Receiving data
client.on('message', (topic, message, packet) => {
  let time = formatTime();
  console.log(`@${time} -- Got data from: ${topic}`);

  // mock heartbeat data
  const hbt = message.toString();
  const newHbt = new heartbeat({
    heartbeat: hbt
  });

  newHbt.save(function(err){
    if(err){
      console.log(err);
    }else{
      console.log('saved');
    }
  });
});
```

**NOTE**: This part subscribes the app to the topic we assigned and receives data from it, then passes it to the database.
