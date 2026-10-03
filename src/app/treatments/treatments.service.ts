import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MqttService } from '../mqtt/mqtt.service';
import { LogsService } from '../logs/logs.service';
import {
  MobilityLevel,
  TreatmentEntity,
  TreatmentGroupConfig,
  TreatmentIntensity,
  TreatmentZone,
} from './entities/treatment.entity';

export type StartTreatmentDto = {
  patientId: string;
  configId?: string | null;
  intensity: TreatmentIntensity;
  treatmentZone?: TreatmentZone;
  mobilityLevel: MobilityLevel;
  targetPressureKpa?: number;
  holdTimeSeconds?: number;
  releaseTimeSeconds?: number;
  cycleTarget?: number;
  inflateTimeSeconds?: number;
  groups?: TreatmentGroupConfig[];
};

@Injectable()
export class TreatmentsService {
  constructor(
    private readonly mqttService: MqttService,
    @InjectRepository(TreatmentEntity)
    private readonly treatmentRepo: Repository<TreatmentEntity>,
    private readonly logsService: LogsService,
  ) {}

  async findAll() {
    await this.syncActiveCycleCount();
    return this.treatmentRepo.find({ order: { startedAt: 'DESC' } });
  }

  async findActive() {
    await this.syncActiveCycleCount();
    return this.treatmentRepo.findOne({
      where: { status: 'running' },
      order: { startedAt: 'DESC' },
    });
  }

  private async syncActiveCycleCount() {
    const active = await this.treatmentRepo.findOne({
      where: { status: 'running' },
      order: { startedAt: 'DESC' },
    });
    if (!active) {
      return;
    }

    const deviceStatus = this.mqttService.getStatus();
    const cycleIndex = Number(deviceStatus?.cycleIndex ?? 0);
    if (!Number.isNaN(cycleIndex) && cycleIndex >= 0) {
      active.cycleCount = cycleIndex;
    }

    if (active.groups?.length && deviceStatus.groups?.length) {
      active.groups = active.groups.map((group) => {
        const liveGroup = deviceStatus.groups?.find(
          (item) => item.groupId === group.groupId,
        );
        return liveGroup
          ? { ...group, cycleCount: Number(liveGroup.cycleIndex ?? 0) }
          : group;
      });
      active.cycleCount = Math.max(
        0,
        ...active.groups.map((group) => group.cycleCount ?? 0),
      );
    }
    if (
      deviceStatus.treatmentId === active.id &&
      ['LISTO', 'MENU', 'MANTENIMIENTO'].includes(deviceStatus.state) &&
      !deviceStatus.treatmentRunning &&
      active.cycleCount > 0
    ) {
      active.status = 'completed';
      active.endedAt = new Date();
      await this.logsService.create({
        level: 'info',
        source: 'treatment',
        category: 'session',
        eventType: 'session_completed',
        treatmentId: active.id,
        message: 'Sesión completada por el dispositivo',
        metadata: { groups: active.groups, cycleCount: active.cycleCount },
      });
    }
    await this.treatmentRepo.save(active);
  }

  async start(dto: StartTreatmentDto, actorUserId?: string) {
    if (!dto.patientId || !dto.mobilityLevel) {
      throw new BadRequestException('patientId and mobilityLevel are required');
    }
    const groups = this.normalizeGroups(dto);

    const active = await this.findActive();
    if (active) {
      throw new ConflictException('There is already a running treatment');
    }
    const deviceStatus = this.mqttService.getStatus();
    if (!deviceStatus.online || !deviceStatus.brokerConnected) {
      throw new ConflictException('The compression device is offline');
    }
    if (deviceStatus.maintenanceMode) {
      throw new ConflictException('Exit maintenance mode before treatment');
    }

    const primaryGroup = groups[0];
    const item = this.treatmentRepo.create({
      patientId: dto.patientId,
      configId: dto.configId ?? (dto.intensity === 'custom' ? 'custom' : null),
      intensity: dto.intensity,
      treatmentZone: primaryGroup.zone,
      mobilityLevel: dto.mobilityLevel,
      targetPressureKpa: primaryGroup.targetPressureKpa,
      holdTimeSeconds: primaryGroup.holdTimeSeconds,
      releaseTimeSeconds: primaryGroup.releaseTimeSeconds,
      cycleTarget: primaryGroup.cycleTarget,
      groups,
      endedAt: null,
      cycleCount: 0,
      status: 'running',
    });

    const saved = await this.treatmentRepo.save(item);
    for (let groupId = 1; groupId <= 4; groupId += 1) {
      const group = groups.find((item) => item.groupId === groupId);
      this.mqttService.publishCommand('SET_GROUP_CONFIG', {
        groupId,
        enabled: group ? 1 : 0,
        ...(group
          ? {
              targetPressureKpa: group.targetPressureKpa,
              inflateTimeMs: Math.round(group.inflateTimeSeconds * 1000),
              holdTimeMs: Math.round(group.holdTimeSeconds * 1000),
              releaseTimeMs: Math.round(group.releaseTimeSeconds * 1000),
              cycleTarget: group.cycleTarget,
            }
          : {}),
      });
    }

    try {
      const ack = await this.mqttService.publishCommandAndWait(
        'START_TREATMENT',
        {
          treatmentId: saved.id,
          activeMask: groups.reduce(
            (mask, group) => mask | (1 << (group.groupId - 1)),
            0,
          ),
        },
        { actorUserId, category: 'session', treatmentId: saved.id },
      );
      if (ack.result !== 'accepted') {
        throw new ConflictException(`Device rejected treatment: ${ack.result}`);
      }
      await this.logsService.create({
        level: 'info',
        source: 'treatment',
        category: 'session',
        eventType: 'session_started',
        treatmentId: saved.id,
        actorUserId,
        requestId: ack.requestId,
        message: `Sesión iniciada con ${groups.length} grupo(s) de compresión`,
        metadata: { patientId: dto.patientId, groups },
      });
    } catch (error) {
      saved.status = 'aborted';
      saved.endedAt = new Date();
      await this.treatmentRepo.save(saved);
      await this.logsService.create({
        level: 'error',
        source: 'treatment',
        category: 'session',
        eventType: 'session_failed',
        treatmentId: saved.id,
        actorUserId,
        message: 'El dispositivo no pudo iniciar la sesión',
        metadata: { error: error instanceof Error ? error.message : error },
      });
      throw error;
    }
    return saved;
  }

  private normalizeGroups(dto: StartTreatmentDto): TreatmentGroupConfig[] {
    const legacyGroup: TreatmentGroupConfig[] = dto.treatmentZone
      ? [
          {
            groupId: 1,
            zone: dto.treatmentZone,
            intensity: dto.intensity,
            targetPressureKpa: Number(dto.targetPressureKpa),
            inflateTimeSeconds: Number(dto.inflateTimeSeconds ?? 15),
            holdTimeSeconds: Number(dto.holdTimeSeconds),
            releaseTimeSeconds: Number(dto.releaseTimeSeconds),
            cycleTarget: Number(dto.cycleTarget),
          },
        ]
      : [];
    const groups = (dto.groups?.length ? dto.groups : legacyGroup).map(
      (group) => ({
        ...group,
        groupId: Number(group.groupId) as 1 | 2 | 3 | 4,
        targetPressureKpa: Number(group.targetPressureKpa),
        inflateTimeSeconds: Number(group.inflateTimeSeconds),
        holdTimeSeconds: Number(group.holdTimeSeconds),
        releaseTimeSeconds: Number(group.releaseTimeSeconds),
        cycleTarget: Number(group.cycleTarget),
      }),
    );

    if (!groups.length || groups.length > 4) {
      throw new BadRequestException(
        'Select between one and four compressor groups',
      );
    }
    if (new Set(groups.map((group) => group.groupId)).size !== groups.length) {
      throw new BadRequestException('Compressor groups cannot be repeated');
    }

    for (const group of groups) {
      const valid =
        group.groupId >= 1 &&
        group.groupId <= 4 &&
        Boolean(group.zone) &&
        Number.isFinite(group.targetPressureKpa) &&
        group.targetPressureKpa >= 1 &&
        group.targetPressureKpa <= 40 &&
        Number.isFinite(group.inflateTimeSeconds) &&
        group.inflateTimeSeconds >= 1 &&
        group.inflateTimeSeconds <= 60 &&
        Number.isFinite(group.holdTimeSeconds) &&
        group.holdTimeSeconds >= 1 &&
        group.holdTimeSeconds <= 60 &&
        Number.isFinite(group.releaseTimeSeconds) &&
        group.releaseTimeSeconds >= 1 &&
        group.releaseTimeSeconds <= 60 &&
        Number.isInteger(group.cycleTarget) &&
        group.cycleTarget >= 1 &&
        group.cycleTarget <= 100;
      if (!valid) {
        throw new BadRequestException(
          `Invalid configuration for compressor group ${group.groupId}`,
        );
      }
    }
    return groups;
  }

  async stop(id: string, actorUserId?: string, medicalReport?: string, interrupted = false) {
    await this.syncActiveCycleCount();
    const item = await this.treatmentRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Treatment not found');
    if (item.status !== 'running') {
      throw new ConflictException('Treatment is not running');
    }
    item.status = interrupted ? 'interrupted' : 'completed';
    item.endedAt = new Date();
    item.medicalReport = medicalReport ?? null;
    const saved = await this.treatmentRepo.save(item);
    this.mqttService.publishCommand('STOP_TREATMENT', { treatmentId: item.id });
    await this.logsService.create({
      level: 'info',
      source: 'treatment',
      category: 'session',
      eventType: interrupted ? 'session_interrupted' : 'session_stopped',
      treatmentId: item.id,
      actorUserId,
      message: interrupted ? 'Sesión interrumpida por un usuario' : 'Sesión detenida por un usuario',
      metadata: { cycleCount: saved.cycleCount, groups: saved.groups, medicalReport: !!medicalReport },
    });
    return saved;
  }
}
