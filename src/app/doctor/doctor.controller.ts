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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from 'src/context/shared/guards/jwt-auth.guard';
import { MqttService } from '../mqtt/mqtt.service';
import { PatientService } from '../users/services/patient.service';
import { Status } from 'src/context/shared/models/active.model';
import { TreatmentsService } from '../treatments/treatments.service';
import { ConfigurationsService } from '../configurations/configurations.service';
import { TreatmentGroupConfig } from '../treatments/entities/treatment.entity';
import { UserPayload } from 'src/context/shared/decorators/user.decorator';
import { PayloadToken } from 'src/context/shared/models/token.model';
import { User } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('doctor')
export class DoctorController {
  constructor(
    private readonly mqttService: MqttService,
    private readonly patientService: PatientService,
    private readonly treatmentsService: TreatmentsService,
    private readonly configurationsService: ConfigurationsService,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  @Get('dashboard/summary')
  async dashboardSummary() {
    const patients = await this.patientService.findAll();
    const activeTreatment = await this.treatmentsService.findActive();
    const latestTreatments = (await this.treatmentsService.findAll()).slice(
      0,
      5,
    );
    const patientsMap = new Map(
      patients.map((patient) => [
        patient.id,
        patient.user?.fullname ?? patient.id,
      ]),
    );

    const enrichedTreatments = latestTreatments.map((item) => ({
      ...item,
      patientName: item.sessionType === 'manual'
        ? 'Sin paciente asociado'
        : (patientsMap.get(item.patientId ?? '') ?? item.patientId),
      durationSeconds: Math.max(
        0,
        Math.floor(
          ((item.endedAt ? new Date(item.endedAt).getTime() : Date.now()) -
            new Date(item.startedAt).getTime()) /
            1000,
        ),
      ),
    }));

    const allTreatments = await this.treatmentsService.findAll();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7));
    const startedAfter = (date: Date) =>
      allTreatments.filter((item) => new Date(item.startedAt) >= date).length;

    const activeTreatmentEnriched = activeTreatment
      ? {
          ...activeTreatment,
          patientName:
            activeTreatment.sessionType === 'manual'
              ? 'Sin paciente asociado'
              : (patientsMap.get(activeTreatment.patientId ?? '') ?? activeTreatment.patientId),
          durationSeconds: Math.max(
            0,
            Math.floor(
              (Date.now() - new Date(activeTreatment.startedAt).getTime()) /
                1000,
            ),
          ),
        }
      : null;

    return {
      mqtt: this.mqttService.getStatus(),
      activeTreatment: activeTreatmentEnriched,
      patientsCount: patients.length,
      latestPatients: patients.slice(0, 5),
      latestTreatments: enrichedTreatments,
      treatmentsToday: startedAfter(todayStart),
      treatmentsThisWeek: startedAfter(weekStart),
      lastTreatment: enrichedTreatments[0] ?? null,
    };
  }

  @Get('dashboard/live')
  async dashboardLive() {
    return {
      status: this.mqttService.getStatus(),
      telemetry: this.mqttService.getLastTelemetry(),
      history: this.mqttService.getTelemetryHistory(),
      activeTreatment: await this.treatmentsService.findActive(),
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
      document: row.document,
      phone: row.phone,
      diagnosis: row.diagnosis,
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
      document?: string;
      phone?: string;
      diagnosis?: string;
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
      document: dto.document,
      phone: dto.phone,
      diagnosis: dto.diagnosis,
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
      document?: string;
      phone?: string;
      diagnosis?: string;
      mobilityLevel?: 'independiente' | 'movilidad_reducida' | 'inmovil';
    },
  ) {
    return this.patientService.update(id, dto);
  }

  @Patch('patients/:id/status')
  updatePatientStatus(
    @Param('id') id: string,
    @Body() dto: { status: Status },
  ) {
    return this.patientService.updateStatus(id, dto.status);
  }

  @Get('treatments/active')
  activeTreatment() {
    return this.treatmentsService.findActive();
  }

  @Get('treatment-profile')
  async treatmentProfile(@UserPayload() user: PayloadToken) {
    const doctor = await this.usersRepo.findOneBy({ id: user.sub });
    return doctor?.customTherapyProfile ?? null;
  }

  @Put('treatment-profile')
  async saveTreatmentProfile(
    @UserPayload() user: PayloadToken,
    @Body() profile: Record<string, unknown>,
  ) {
    await this.usersRepo.update(user.sub, { customTherapyProfile: profile });
    return profile;
  }

  @Post('treatments/start')
  async startTreatment(
    @UserPayload() user: PayloadToken,
    @Body()
    dto: {
      patientId?: string;
      manual?: boolean;
      intensity?: 'low' | 'medium' | 'high' | 'custom';
      groups?: TreatmentGroupConfig[];
    },
  ) {
    if (!dto.intensity || !dto.groups?.length) return null;
    const config = dto.intensity === 'custom'
      ? null
      : await this.configurationsService.findByIntensity(dto.intensity);
    if (dto.intensity !== 'custom' && !config) return null;
    return this.treatmentsService.start(
      {
        patientId: dto.patientId,
        sessionType: dto.manual ? 'manual' : 'patient',
        configId: config?.id ?? 'custom',
        intensity: dto.intensity,
        groups: dto.groups.map((group) =>
          group.intensity === 'custom' || !config
            ? group
            : {
                ...group,
                intensity: dto.intensity!,
                targetPressureKpa: config.targetPressureKpa,
                inflateTimeSeconds: config.inflateTimeSeconds,
                holdTimeSeconds: config.holdTimeSeconds,
                releaseTimeSeconds: config.releaseTimeSeconds,
                cycleTarget: config.cycleTarget,
              },
        ),
      },
      user.sub,
    );
  }

  @Post('treatments/:id/stop')
  stopTreatment(
    @UserPayload() user: PayloadToken,
    @Param('id') id: string,
    @Body() body: { medicalReport?: string; interrupted?: boolean },
  ) {
    return this.treatmentsService.stop(id, user.sub, body?.medicalReport, body?.interrupted);
  }

  @Post('treatments/:id/complete')
  completeTreatment(
    @UserPayload() user: PayloadToken,
    @Param('id') id: string,
    @Body() body: { medicalReport?: string },
  ) {
    return this.treatmentsService.complete(id, user.sub, body?.medicalReport);
  }

  @Get('treatments/:id/telemetry')
  treatmentTelemetry(@Param('id') id: string) {
    return this.treatmentsService.findTelemetry(id);
  }

  @Get('treatments/history')
  async history(
    @Query('patientId') patientId?: string,
    @Query('status') status?: string,
  ) {
    let rows = await this.treatmentsService.findAll();
    if (patientId) rows = rows.filter((x) => x.patientId === patientId);
    if (status) rows = rows.filter((x) => x.status === status);

    const patientRows = await this.patientService.findAll();
    const patientsMap = new Map(
      patientRows.map((patient) => [
        patient.id,
        patient.user?.fullname ?? patient.id,
      ]),
    );
    return rows.map((item) => ({
      ...item,
      patientName: item.sessionType === 'manual'
        ? 'Sin paciente asociado'
        : (patientsMap.get(item.patientId ?? '') ?? item.patientId),
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
