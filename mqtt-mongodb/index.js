const express = require('express');
const mongoose = require('mongoose');
const mqtt = require('mqtt');
const app = express();

app.use(express.json());

const vcap_services = JSON.parse(process.env.VCAP_SERVICES);
const replicaSetName = vcap_services['mongodb-innoworks'][0].credentials.replicaSetName;
const db = vcap_services['mongodb-innoworks'][0].credentials.uri + '?replicaSet=' + replicaSetName;

mongoose.connect(db)
  .then(() => console.log('Connected to the MongoDB...'))
  .catch(err => console.log('Could not connect to MongoDB...', err));

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

app.get('/', (req, res) => {
  res.send('Hello WISE-PaaS! Welcome!');
});

app.get('/hbts', function(req, res){
  heartbeat.find({}, function(err,hbts){
    if(err){
      console.log(err);
    }
    else{
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send({ heartbeats: hbts });
    }
  })
})

const port = process.env.PORT || 3030;
const server = app.listen(port, () => console.log(`Listening on port ${port}...`));

// -- Get env variables for rabbitmq service
const vcapServices = JSON.parse(process.env.VCAP_SERVICES);
const mqttUri = vcapServices['p-rabbitmq'][0].credentials.protocols.mqtt.uri

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

// Return current formatted time
function formatTime() {
  const currentDate = new Date();
  return currentDate.getHours() + ':' + currentDate.getMinutes() + ':' + currentDate.getSeconds();
}
