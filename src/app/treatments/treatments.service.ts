import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MqttService } from '../mqtt/mqtt.service';

export type TreatmentStatus = 'running' | 'completed' | 'aborted';

export type Treatment = {
  id: string;
  patientId: string;
  configId: string;
  intensity?: 'low' | 'medium' | 'high';
  startedAt: Date;
  endedAt: Date | null;
  cycleCount: number;
  status: TreatmentStatus;
};

@Injectable()
export class TreatmentsService {
  private readonly treatments: Treatment[] = [];

  constructor(private readonly mqttService: MqttService) {}

  findAll() {
    this.syncActiveCycleCount();
    return this.treatments;
  }

  findActive() {
    this.syncActiveCycleCount();
    return this.treatments.find((item) => item.status === 'running') ?? null;
  }

  private syncActiveCycleCount() {
    const active = this.treatments.find((item) => item.status === 'running');
    if (!active) {
      return;
    }

    const cycleIndex = Number(this.mqttService.getStatus()?.cycleIndex ?? 0);
    if (!Number.isNaN(cycleIndex) && cycleIndex >= 0) {
      active.cycleCount = cycleIndex;
    }
  }

  start(dto: {
    patientId: string;
    configId: string;
    intensity?: 'low' | 'medium' | 'high';
    targetPressureKpa?: number;
    holdTimeSeconds?: number;
    releaseTimeSeconds?: number;
    cycleTarget?: number;
  }) {
    const active = this.findActive();
    if (active) {
      throw new ConflictException('There is already a running treatment');
    }

    const item: Treatment = {
      id: randomUUID(),
      patientId: dto.patientId,
      configId: dto.configId,
      intensity: dto.intensity,
      startedAt: new Date(),
      endedAt: null,
      cycleCount: 0,
      status: 'running',
    };

    this.treatments.unshift(item);

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
    return item;
  }

  stop(id: string) {
    this.syncActiveCycleCount();
    const item = this.treatments.find((t) => t.id === id);
    if (!item) throw new NotFoundException('Treatment not found');
    if (item.status !== 'running') {
      throw new ConflictException('Treatment is not running');
    }
    item.status = 'completed';
    item.endedAt = new Date();
    this.mqttService.publishCommand('STOP_TREATMENT', { treatmentId: item.id });
    return item;
  }
}
