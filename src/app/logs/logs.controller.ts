import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { LogsService } from './logs.service';

@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  findAll(@Query('limit') limit?: string) {
    return this.logsService.findAll(limit ? Number(limit) : 100);
  }

  @Post()
  create(
    @Body()
    dto: {
      level: 'info' | 'warn' | 'error';
      source: string;
      message: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.logsService.create(dto);
  }
}
