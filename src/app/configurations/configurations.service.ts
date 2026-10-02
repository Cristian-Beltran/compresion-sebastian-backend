import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntensityType, TherapyConfig } from './entities/therapy-config.entity';

@Injectable()
export class ConfigurationsService implements OnModuleInit {
  constructor(
    @InjectRepository(TherapyConfig)
    private readonly configsRepo: Repository<TherapyConfig>,
  ) {}

  async onModuleInit() {
    const defaults: Omit<TherapyConfig, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        intensity: 'low',
        targetPressureKpa: 3,
        inflateTimeSeconds: 15,
        holdTimeSeconds: 8,
        releaseTimeSeconds: 4,
        cycleTarget: 20,
      },
      {
        intensity: 'medium',
        targetPressureKpa: 5,
        inflateTimeSeconds: 15,
        holdTimeSeconds: 10,
        releaseTimeSeconds: 5,
        cycleTarget: 25,
      },
      {
        intensity: 'high',
        targetPressureKpa: 7,
        inflateTimeSeconds: 15,
        holdTimeSeconds: 12,
        releaseTimeSeconds: 6,
        cycleTarget: 30,
      },
    ];

    for (const def of defaults) {
      const exists = await this.configsRepo.findOne({
        where: { intensity: def.intensity },
      });
      if (!exists) {
        await this.configsRepo.save(this.configsRepo.create(def));
      }
    }
  }

  findAll() {
    return this.configsRepo.find({ order: { intensity: 'ASC' } });
  }

  findByIntensity(intensity: IntensityType) {
    return this.configsRepo.findOne({ where: { intensity } });
  }

  async update(intensity: IntensityType, values: Partial<TherapyConfig>) {
    const row = await this.configsRepo.findOne({ where: { intensity } });
    if (!row) return null;
    row.targetPressureKpa = values.targetPressureKpa ?? row.targetPressureKpa;
    row.inflateTimeSeconds =
      values.inflateTimeSeconds ?? row.inflateTimeSeconds;
    row.holdTimeSeconds = values.holdTimeSeconds ?? row.holdTimeSeconds;
    row.releaseTimeSeconds =
      values.releaseTimeSeconds ?? row.releaseTimeSeconds;
    row.cycleTarget = values.cycleTarget ?? row.cycleTarget;
    return this.configsRepo.save(row);
  }
}
