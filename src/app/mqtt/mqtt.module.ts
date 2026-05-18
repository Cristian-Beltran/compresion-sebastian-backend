import { Module } from '@nestjs/common';
import { MqttController } from './mqtt.controller';
import { MqttService } from './mqtt.service';
import { LogsModule } from '../logs/logs.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [LogsModule, AlertsModule],
  controllers: [MqttController],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
