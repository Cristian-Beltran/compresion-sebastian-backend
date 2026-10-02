import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogsModule } from '../logs/logs.module';
import { MqttModule } from '../mqtt/mqtt.module';
import { CalibrationsController } from './calibrations.controller';
import { CalibrationsService } from './calibrations.service';
import { SensorCalibration } from './entities/sensor-calibration.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SensorCalibration]),
    MqttModule,
    LogsModule,
  ],
  controllers: [CalibrationsController],
  providers: [CalibrationsService],
  exports: [CalibrationsService],
})
export class CalibrationsModule {}
