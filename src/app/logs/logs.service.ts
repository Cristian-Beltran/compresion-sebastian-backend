import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemLog } from './entities/system-log.entity';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(SystemLog)
    private readonly logsRepo: Repository<SystemLog>,
  ) {}

  async create(input: {
    level: 'info' | 'warn' | 'error';
    source: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    const row = this.logsRepo.create(input);
    return this.logsRepo.save(row);
  }

  async findAll(limit = 100) {
    return this.logsRepo.find({ order: { createdAt: 'DESC' }, take: limit });
  }
}
