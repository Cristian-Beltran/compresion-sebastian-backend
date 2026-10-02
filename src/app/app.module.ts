import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'src/context/database/database.module';
import config from 'src/context/shared/config';
import { LoggerModule } from 'src/context/shared/logger';
// entry point
import { AuthModule } from 'src/context/auth/auth.module';
import { UsersModule } from './users/user.module';
import { SessionModule } from './sesion/sesion.module';
import { DeviceModule } from './device/device.module';
import { ConfigurationsModule } from './configurations/configurations.module';
import { LogsModule } from './logs/logs.module';
import { AlertsModule } from './alerts/alerts.module';
import { TreatmentsModule } from './treatments/treatments.module';
import { MqttModule } from './mqtt/mqtt.module';
import { DoctorModule } from './doctor/doctor.module';
import { CalibrationsModule } from './calibrations/calibrations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [config],
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    UsersModule,
    LoggerModule,
    AuthModule,
    SessionModule,
    DeviceModule,
    ConfigurationsModule,
    LogsModule,
    AlertsModule,
    TreatmentsModule,
    MqttModule,
    DoctorModule,
    CalibrationsModule,
  ],
})
export class AppModule {}
