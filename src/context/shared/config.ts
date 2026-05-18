import { registerAs } from '@nestjs/config';

const APP_SETTINGS = {
  jwtSecret: 'vasoflow-dev-secret',
  sqlitePath: 'data/app.db',
  mqttUrl: 'mqtt://broker.hivemq.com:1883',
  mqttTopicRoot: 'vasoflow',
  mqttDeviceId: 'esp32-01',
};

export default registerAs('config', () => {
  return {
    database: {
      type: 'sqlite',
      sqlitePath: APP_SETTINGS.sqlitePath,
    },
    apiKey: '',
    jwtSecret: APP_SETTINGS.jwtSecret,
    mqtt: {
      url: APP_SETTINGS.mqttUrl,
      topicRoot: APP_SETTINGS.mqttTopicRoot,
      deviceId: APP_SETTINGS.mqttDeviceId,
    },
  };
});
