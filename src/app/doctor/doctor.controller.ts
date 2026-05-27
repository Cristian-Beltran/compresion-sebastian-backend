import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/context/shared/guards/jwt-auth.guard';
import { MqttService } from '../mqtt/mqtt.service';
import { PatientService } from '../users/services/patient.service';
import { Status } from 'src/context/shared/models/active.model';
import { TreatmentsService } from '../treatments/treatments.service';
import { ConfigurationsService } from '../configurations/configurations.service';

@UseGuards(JwtAuthGuard)
@Controller('doctor')
export class DoctorController {
  constructor(
    private readonly mqttService: MqttService,
    private readonly patientService: PatientService,
    private readonly treatmentsService: TreatmentsService,
    private readonly configurationsService: ConfigurationsService,
  ) {}

  @Get('dashboard/summary')
  async dashboardSummary() {
    const patients = await this.patientService.findAll();
    const activeTreatment = this.treatmentsService.findActive();
    const latestTreatments = this.treatmentsService.findAll().slice(0, 5);
    const patientsMap = new Map(
      patients.map((patient) => [patient.id, patient.user?.fullname ?? patient.id]),
    );

    const enrichedTreatments = latestTreatments.map((item) => ({
      ...item,
      patientName: patientsMap.get(item.patientId) ?? item.patientId,
      durationSeconds: Math.max(
        0,
        Math.floor(
          ((item.endedAt ? new Date(item.endedAt).getTime() : Date.now()) -
            new Date(item.startedAt).getTime()) /
            1000,
        ),
      ),
    }));

    const activeTreatmentEnriched = activeTreatment
      ? {
          ...activeTreatment,
          patientName: patientsMap.get(activeTreatment.patientId) ?? activeTreatment.patientId,
          durationSeconds: Math.max(
            0,
            Math.floor((Date.now() - new Date(activeTreatment.startedAt).getTime()) / 1000),
          ),
        }
      : null;

    return {
      mqtt: this.mqttService.getStatus(),
      activeTreatment: activeTreatmentEnriched,
      patientsCount: patients.length,
      latestPatients: patients.slice(0, 5),
      latestTreatments: enrichedTreatments,
    };
  }

  @Get('dashboard/live')
  dashboardLive() {
    return {
      status: this.mqttService.getStatus(),
      telemetry: this.mqttService.getLastTelemetry(),
      history: this.mqttService.getTelemetryHistory(),
      activeTreatment: this.treatmentsService.findActive(),
    };
  }

  @Get('patients')
  async findPatients() {
    const rows = await this.patientService.findAll();
    return rows.map((row) => ({
      id: row.id,
      fullname: row.user?.fullname ?? '',
      status: row.user?.status,
      age: row.age,
      sex: row.sex,
      treatedLimb: row.treatedLimb,
      mobilityLevel: row.mobilityLevel,
      registeredAt: row.user?.createdAt,
    }));
  }

  @Post('patients')
  createPatient(
    @Body()
    dto: {
      fullname: string;
      age?: number;
      sex?: 'masculino' | 'femenino' | 'otro';
      treatedLimb?: string;
      mobilityLevel?: 'independiente' | 'movilidad_reducida' | 'inmovil';
    },
  ) {
    const slug = dto.fullname.toLowerCase().trim().replace(/\s+/g, '.');
    return this.patientService.create({
      fullname: dto.fullname,
      email: `${slug}.${Date.now()}@patient.local`,
      password: 'Patient123*',
      address: 'N/A',
      age: dto.age,
      sex: dto.sex,
      treatedLimb: dto.treatedLimb,
      mobilityLevel: dto.mobilityLevel,
    });
  }

  @Put('patients/:id')
  updatePatient(
    @Param('id') id: string,
    @Body()
    dto: {
      fullname?: string;
      email?: string;
      address?: string;
      age?: number;
      sex?: 'masculino' | 'femenino' | 'otro';
      treatedLimb?: string;
      mobilityLevel?: 'independiente' | 'movilidad_reducida' | 'inmovil';
    },
  ) {
    return this.patientService.update(id, dto);
  }

  @Patch('patients/:id/status')
  updatePatientStatus(@Param('id') id: string, @Body() dto: { status: Status }) {
    return this.patientService.updateStatus(id, dto.status);
  }

  @Get('treatments/active')
  activeTreatment() {
    return this.treatmentsService.findActive();
  }

  @Post('treatments/start')
  async startTreatment(
    @Body() dto: { patientId: string; intensity: 'low' | 'medium' | 'high' },
  ) {
    const config = await this.configurationsService.findByIntensity(dto.intensity);
    if (!config) return null;
    return this.treatmentsService.start({
      patientId: dto.patientId,
      configId: config.id,
      intensity: dto.intensity,
      targetPressureKpa: config.targetPressureKpa,
      holdTimeSeconds: config.holdTimeSeconds,
      releaseTimeSeconds: config.releaseTimeSeconds,
      cycleTarget: config.cycleTarget,
    });
  }

  @Post('treatments/:id/stop')
  stopTreatment(@Param('id') id: string) {
    return this.treatmentsService.stop(id);
  }

  @Get('treatments/history')
  async history(@Query('patientId') patientId?: string, @Query('status') status?: string) {
    let rows = this.treatmentsService.findAll();
    if (patientId) rows = rows.filter((x) => x.patientId === patientId);
    if (status) rows = rows.filter((x) => x.status === status);

    const patientRows = await this.patientService.findAll();
    const patientsMap = new Map(
      patientRows.map((patient) => [patient.id, patient.user?.fullname ?? patient.id]),
    );
    return rows.map((item) => ({
      ...item,
      patientName: patientsMap.get(item.patientId) ?? item.patientId,
      durationSeconds: Math.max(
        0,
        Math.floor(
          ((item.endedAt ? new Date(item.endedAt).getTime() : Date.now()) -
            new Date(item.startedAt).getTime()) /
            1000,
        ),
      ),
    }));
  }
}
