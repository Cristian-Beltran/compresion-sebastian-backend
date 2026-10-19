import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreatmentsController } from './treatments.controller';
import { MqttModule } from '../mqtt/mqtt.module';
import { TreatmentsService } from './treatments.service';
import { TreatmentEntity } from './entities/treatment.entity';
import { TreatmentTelemetryEntity } from './entities/treatment-telemetry.entity';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [
    forwardRef(() => MqttModule),
    LogsModule,
    TypeOrmModule.forFeature([TreatmentEntity, TreatmentTelemetryEntity]),
  ],
  controllers: [TreatmentsController],
  providers: [TreatmentsService],
  exports: [TreatmentsService],
})
export class TreatmentsModule {}
