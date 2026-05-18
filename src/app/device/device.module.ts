import { Module } from '@nestjs/common';
import { DeviceController } from './device.controller';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [MqttModule],
  controllers: [DeviceController],
})
export class DeviceModule {}
