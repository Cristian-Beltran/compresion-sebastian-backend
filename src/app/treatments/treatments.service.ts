import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MqttService } from '../mqtt/mqtt.service';
import {
  MobilityLevel,
  TreatmentEntity,
  TreatmentIntensity,
  TreatmentZone,
} from './entities/treatment.entity';

export type StartTreatmentDto = {
  patientId: string;
  configId?: string | null;
  intensity: TreatmentIntensity;
  treatmentZone: TreatmentZone;
  mobilityLevel: MobilityLevel;
  targetPressureKpa?: number;
  holdTimeSeconds?: number;
  releaseTimeSeconds?: number;
  cycleTarget?: number;
};

@Injectable()
export class TreatmentsService {
  constructor(
    private readonly mqttService: MqttService,
    @InjectRepository(TreatmentEntity)
    private readonly treatmentRepo: Repository<TreatmentEntity>,
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

    const cycleIndex = Number(this.mqttService.getStatus()?.cycleIndex ?? 0);
    if (!Number.isNaN(cycleIndex) && cycleIndex >= 0) {
      active.cycleCount = cycleIndex;
      await this.treatmentRepo.save(active);
    }
  }

  async start(dto: StartTreatmentDto) {
    if (!dto.patientId || !dto.treatmentZone || !dto.mobilityLevel) {
      throw new BadRequestException('patientId, treatmentZone and mobilityLevel are required');
    }
    if (
      dto.intensity === 'custom' &&
      (!dto.targetPressureKpa ||
        !dto.holdTimeSeconds ||
        !dto.releaseTimeSeconds ||
        !dto.cycleTarget)
    ) {
      throw new BadRequestException('Custom treatments require pressure, hold, release and cycles');
    }

    const active = await this.findActive();
    if (active) {
      throw new ConflictException('There is already a running treatment');
    }

    const item = this.treatmentRepo.create({
      patientId: dto.patientId,
      configId: dto.configId ?? (dto.intensity === 'custom' ? 'custom' : null),
      intensity: dto.intensity,
      treatmentZone: dto.treatmentZone,
      mobilityLevel: dto.mobilityLevel,
      targetPressureKpa: dto.targetPressureKpa,
      holdTimeSeconds: dto.holdTimeSeconds,
      releaseTimeSeconds: dto.releaseTimeSeconds,
      cycleTarget: dto.cycleTarget,
      endedAt: null,
      cycleCount: 0,
      status: 'running',
    });

    const saved = await this.treatmentRepo.save(item);

    this.mqttService.publishCommand('SET_CONFIG', {
      targetPressureKpa: dto.targetPressureKpa,
      holdTimeMs:
        dto.holdTimeSeconds === undefined ? undefined : Math.round(dto.holdTimeSeconds * 1000),
      releaseTimeMs:
        dto.releaseTimeSeconds === undefined ? undefined : Math.round(dto.releaseTimeSeconds * 1000),
      cycleTarget: dto.cycleTarget,
    });

    this.mqttService.publishCommand('START_TREATMENT', {
      targetPressureKpa: dto.targetPressureKpa,
      holdTimeMs:
        dto.holdTimeSeconds === undefined ? undefined : Math.round(dto.holdTimeSeconds * 1000),
      releaseTimeMs:
        dto.releaseTimeSeconds === undefined ? undefined : Math.round(dto.releaseTimeSeconds * 1000),
      cycleTarget: dto.cycleTarget,
    });
    return saved;
  }

  async stop(id: string) {
    await this.syncActiveCycleCount();
    const item = await this.treatmentRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Treatment not found');
    if (item.status !== 'running') {
      throw new ConflictException('Treatment is not running');
    }
    item.status = 'completed';
    item.endedAt = new Date();
    const saved = await this.treatmentRepo.save(item);
    this.mqttService.publishCommand('STOP_TREATMENT', { treatmentId: item.id });
    return saved;
  }
}
