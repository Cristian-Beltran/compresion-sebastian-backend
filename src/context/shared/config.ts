import { registerAs } from '@nestjs/config';

export default registerAs('config', () => {
  return {
    port: parseInt(process.env.PORT ?? '3001', 10),
    database: {
      type: 'sqlite',
      sqlitePath: process.env.SQLITE_PATH ?? 'data/sebastian.sqlite',
    },
    apiKey: process.env.API_KEY ?? 'local-api-key',
    jwtSecret: process.env.JWT_SECRET ?? 'sebastian-dev-jwt-secret',
    mqtt: {
      url: process.env.MQTT_URL ?? 'mqtt://localhost:1883',
      user: process.env.MQTT_USER ?? '',
      password: process.env.MQTT_PASSWORD ?? '',
      topicRoot: process.env.MQTT_TOPIC_ROOT ?? 'sebastian',
      deviceId: process.env.MQTT_DEVICE_ID ?? 'esp32-01',
    },
    corsOrigins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
      : ['http://localhost:5173', 'http://localhost:4173'],
    migrationSecret: process.env.MIGRATION_SECRET ?? '',
  };
});
