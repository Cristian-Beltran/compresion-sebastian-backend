import { Module } from '@nestjs/common';
import { DoctorController } from './doctor.controller';
import { MqttModule } from '../mqtt/mqtt.module';
import { UsersModule } from '../users/user.module';
import { TreatmentsModule } from '../treatments/treatments.module';
import { ConfigurationsModule } from '../configurations/configurations.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [MqttModule, UsersModule, TreatmentsModule, ConfigurationsModule, TypeOrmModule.forFeature([User])],
  controllers: [DoctorController],
})
export class DoctorModule {}
