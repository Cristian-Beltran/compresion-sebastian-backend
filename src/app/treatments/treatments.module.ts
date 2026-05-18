import { Module } from '@nestjs/common';
import { TreatmentsController } from './treatments.controller';
import { MqttModule } from '../mqtt/mqtt.module';
import { TreatmentsService } from './treatments.service';

@Module({
  imports: [MqttModule],
  controllers: [TreatmentsController],
  providers: [TreatmentsService],
  exports: [TreatmentsService],
})
export class TreatmentsModule {}
