import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AlertsService } from './alerts.service';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  findAll() {
    return this.alertsService.findAll();
  }

  @Post()
  create(
    @Body()
    dto: {
      severity: 'info' | 'warn' | 'critical';
      message: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.alertsService.create(dto);
  }

  @Patch(':id/resolve')
  resolve(@Param('id') id: string) {
    return this.alertsService.resolve(id);
  }
}
