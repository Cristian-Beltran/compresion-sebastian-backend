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
    return this.treatments;
  }

  findActive() {
    return this.treatments.find((item) => item.status === 'running') ?? null;
  }

  start(dto: {
    patientId: string;
    configId: string;
    intensity?: 'low' | 'medium' | 'high';
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
    this.mqttService.publishCommand('START_TREATMENT', {
      treatmentId: item.id,
      patientId: item.patientId,
      configId: item.configId,
      intensity: item.intensity,
    });
    return item;
  }

  stop(id: string) {
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
