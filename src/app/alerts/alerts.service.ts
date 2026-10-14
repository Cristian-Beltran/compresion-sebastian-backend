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
    component?: string;
    metadata?: Record<string, unknown>;
  }) {
    const row = this.alertsRepo.create({
      ...input,
      component: input.component ?? this.inferComponent(input.message, input.metadata),
      active: true,
      resolvedAt: null,
    });
    return this.alertsRepo.save(row);
  }

  async findAll() {
    const rows = await this.alertsRepo.find({ order: { createdAt: 'DESC' } });
    return rows.map((row) => ({
      ...row,
      component: row.component ?? this.inferComponent(row.message, row.metadata),
    }));
  }

  async resolve(id: string) {
    const row = await this.alertsRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Alert not found');
    row.active = false;
    row.resolvedAt = new Date();
    return this.alertsRepo.save(row);
  }

  private inferComponent(message: string, metadata?: Record<string, unknown>) {
    const explicit = metadata?.component ?? metadata?.source ?? metadata?.sensor;
    if (typeof explicit === 'string' && explicit.trim()) return explicit;
    const text = message.toLowerCase();
    if (text.includes('temper') || text.includes('termic')) return 'Temperatura';
    if (text.includes('pres')) return 'Presión';
    if (text.includes('fuerza') || text.includes('force')) return 'Fuerza';
    if (text.includes('bomba') || text.includes('pump')) return 'Bomba';
    if (text.includes('válvula') || text.includes('valvula') || text.includes('valve')) return 'Válvula';
    if (text.includes('wifi') || text.includes('red')) return 'Wi‑Fi';
    return 'Sistema';
  }
}
