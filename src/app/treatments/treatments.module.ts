import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreatmentsController } from './treatments.controller';
import { MqttModule } from '../mqtt/mqtt.module';
import { TreatmentsService } from './treatments.service';
import { TreatmentEntity } from './entities/treatment.entity';

@Module({
  imports: [MqttModule, TypeOrmModule.forFeature([TreatmentEntity])],
  controllers: [TreatmentsController],
  providers: [TreatmentsService],
  exports: [TreatmentsService],
})
export class TreatmentsModule {}
