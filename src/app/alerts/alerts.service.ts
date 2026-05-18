import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from './entities/alert.entity';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly alertsRepo: Repository<Alert>,
  ) {}

  async create(input: {
    severity: 'info' | 'warn' | 'critical';
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    const row = this.alertsRepo.create({ ...input, active: true, resolvedAt: null });
    return this.alertsRepo.save(row);
  }

  async findAll() {
    return this.alertsRepo.find({ order: { createdAt: 'DESC' } });
  }

  async resolve(id: string) {
    const row = await this.alertsRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Alert not found');
    row.active = false;
    row.resolvedAt = new Date();
    return this.alertsRepo.save(row);
  }
}
