import { forwardRef, Module } from '@nestjs/common';
import { MqttController } from './mqtt.controller';
import { MqttService } from './mqtt.service';
import { LogsModule } from '../logs/logs.module';
import { AlertsModule } from '../alerts/alerts.module';
import { TreatmentsModule } from '../treatments/treatments.module';

@Module({
  imports: [LogsModule, AlertsModule, forwardRef(() => TreatmentsModule)],
  controllers: [MqttController],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
