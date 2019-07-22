const mqtt = require('mqtt')

// -- Get env variables for rabbitmq service
const mqttUri = 'mqtt://f456d95d-b76f-43e9-8b35-bac8383bf941%3A4ba10620-0b77-4a4e-b6ef-291ae8e81c16:NH3BBewakBvz5zV2OtLoOuOwr@40.81.27.10:1883';

// Use mqttUri or connectOpts
const client = mqtt.connect(mqttUri);

client.on('connect', (connack) => {
  setInterval(() => {
    publishMockHbt();
  }, 1000);
});

// Publish mock heartbeat periodically
function publishMockHbt() {
  const hbt = Math.floor((Math.random() * 6) + 70);

  client.publish('ward/heartbeat', hbt.toString(), { qos: 2 }, (err, packet) => {
    if (!err) console.log('Data sent to ward/heartbeat -- ' + hbt);
  });
}
