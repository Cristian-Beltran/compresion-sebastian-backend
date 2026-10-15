import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SystemLog } from './entities/system-log.entity';
import { User } from '../users/entities/user.entity';

export type LogLevel = 'info' | 'warn' | 'error';
export type LogQuery = {
  page?: number;
  pageSize?: number;
  level?: string;
  category?: string;
  eventType?: string;
  groupId?: number;
  treatmentId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

@Injectable()
export class LogsService implements OnModuleInit, OnModuleDestroy {
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(SystemLog)
    private readonly logsRepo: Repository<SystemLog>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  onModuleInit() {
    void this.cleanupTechnicalEvents();
    this.cleanupTimer = setInterval(
      () => void this.cleanupTechnicalEvents(),
      24 * 60 * 60 * 1000,
    );
    this.cleanupTimer.unref();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  async create(input: {
    level: LogLevel;
    source: string;
    message: string;
    category?: string;
    eventType?: string;
    deviceId?: string;
    groupId?: number;
    treatmentId?: string;
    actorUserId?: string;
    actorRole?: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
  }) {
    // El registro de actividad es una auditoría de personas, no un historial
    // técnico del broker, dispositivo o telemetría. Sin usuario no se guarda.
    if (!input.actorUserId) return null;
    const actor = input.actorUserId
      ? await this.usersRepo.findOneBy({ id: input.actorUserId })
      : null;
    const row = this.logsRepo.create({
      ...input,
      actorRole: input.actorRole ?? actor?.type ?? 'sistema',
      metadata: {
        ...(input.metadata ?? {}),
        actorName: actor?.fullname ?? 'Sistema',
        action: input.eventType ?? input.message,
        module: input.source || 'sistema',
      },
    });
    return this.logsRepo.save(row);
  }

  private async present(items: SystemLog[]) {
    const ids = [...new Set(items.map((item) => item.actorUserId).filter(Boolean))] as string[];
    const users = ids.length ? await this.usersRepo.findBy({ id: In(ids) }) : [];
    const names = new Map(users.map((user) => [user.id, user.fullname]));
    return items.map((item) => {
      const metadata = item.metadata ?? {};
      return {
        ...item,
        user: names.get(item.actorUserId ?? '') ?? metadata.actorName ?? 'Sistema',
        role: item.actorRole ?? 'sistema',
        action: metadata.action ?? item.eventType ?? item.message,
        module: metadata.module ?? item.source ?? 'sistema',
      };
    });
  }

  async findAll(limit = 100) {
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    return this.present(await this.logsRepo.find({
      order: { createdAt: 'DESC' },
      take: safeLimit,
    }));
  }

  async search(query: LogQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100);
    const builder = this.logsRepo
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (query.level && query.level !== 'all') {
      builder.andWhere('log.level = :level', { level: query.level });
    }
    if (query.category && query.category !== 'all') {
      builder.andWhere('log.category = :category', {
        category: query.category,
      });
    }
    if (query.eventType) {
      builder.andWhere('log.eventType = :eventType', {
        eventType: query.eventType,
      });
    }
    if (query.groupId) {
      builder.andWhere('log.groupId = :groupId', { groupId: query.groupId });
    }
    if (query.treatmentId) {
      builder.andWhere('log.treatmentId = :treatmentId', {
        treatmentId: query.treatmentId,
      });
    }
    if (query.dateFrom) {
      builder.andWhere('log.createdAt >= :dateFrom', {
        dateFrom: new Date(query.dateFrom),
      });
    }
    if (query.dateTo) {
      builder.andWhere('log.createdAt <= :dateTo', {
        dateTo: new Date(query.dateTo),
      });
    }
    if (query.search?.trim()) {
      builder.andWhere(
        "(LOWER(log.message) LIKE :search OR LOWER(log.source) LIKE :search OR LOWER(COALESCE(log.eventType, '')) LIKE :search)",
        { search: `%${query.search.trim().toLowerCase()}%` },
      );
    }

    const [items, total] = await builder.getManyAndCount();
    return { items: await this.present(items), total, page, pageSize };
  }

  async cleanupTechnicalEvents() {
    const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    return this.logsRepo
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoff', { cutoff })
      .andWhere('(category IN (:...categories) OR eventType = :summaryEvent)', {
        categories: ['connection', 'telemetry', 'control', 'command'],
        summaryEvent: 'telemetry_summary',
      })
      .execute();
  }

  async searchTechnical(query: LogQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100);
    const builder = this.logsRepo
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .where("log.actorRole = 'technical'")
      .andWhere(
        "log.category IN (:...categories)",
        {
          categories: [
            'control',
            'calibration',
            'maintenance',
            'sensor_test',
            'protocol_modified',
          ],
        },
      );

    if (query.search?.trim()) {
      builder.andWhere(
        "(LOWER(log.message) LIKE :search OR LOWER(log.source) LIKE :search)",
        { search: `%${query.search.trim().toLowerCase()}%` },
      );
    }
    if (query.dateFrom) {
      builder.andWhere('log.createdAt >= :dateFrom', {
        dateFrom: new Date(query.dateFrom),
      });
    }
    if (query.dateTo) {
      builder.andWhere('log.createdAt <= :dateTo', {
        dateTo: new Date(query.dateTo),
      });
    }

    const [items, total] = await builder.getManyAndCount();
    return { items, total, page, pageSize };
  }

  async searchAdmin(query: LogQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100);
    const builder = this.logsRepo
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .where(
        "log.category IN (:...categories)",
        {
          categories: [
            'patient_created',
            'patient_updated',
            'session_started',
            'session_stopped',
            'session_completed',
            'user_created',
            'user_status_changed',
            'password_reset',
          ],
        },
      );

    if (query.search?.trim()) {
      builder.andWhere(
        "(LOWER(log.message) LIKE :search OR LOWER(log.source) LIKE :search)",
        { search: `%${query.search.trim().toLowerCase()}%` },
      );
    }
    if (query.dateFrom) {
      builder.andWhere('log.createdAt >= :dateFrom', {
        dateFrom: new Date(query.dateFrom),
      });
    }
    if (query.dateTo) {
      builder.andWhere('log.createdAt <= :dateTo', {
        dateTo: new Date(query.dateTo),
      });
    }

    const [items, total] = await builder.getManyAndCount();
    return { items, total, page, pageSize };
  }
}
