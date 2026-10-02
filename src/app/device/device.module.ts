import { Module } from '@nestjs/common';
import { DeviceController } from './device.controller';
import { MqttModule } from '../mqtt/mqtt.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [MqttModule, LogsModule],
  controllers: [DeviceController],
})
export class DeviceModule {}
