import { Module } from '@nestjs/common';
import { DoctorController } from './doctor.controller';
import { MqttModule } from '../mqtt/mqtt.module';
import { UsersModule } from '../users/user.module';
import { TreatmentsModule } from '../treatments/treatments.module';
import { ConfigurationsModule } from '../configurations/configurations.module';

@Module({
  imports: [MqttModule, UsersModule, TreatmentsModule, ConfigurationsModule],
  controllers: [DoctorController],
})
export class DoctorModule {}
