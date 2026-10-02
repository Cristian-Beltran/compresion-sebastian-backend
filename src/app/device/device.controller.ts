import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserPayload } from 'src/context/shared/decorators/user.decorator';
import { PayloadToken } from 'src/context/shared/models/token.model';
import { LogsService } from '../logs/logs.service';
import { MqttService } from '../mqtt/mqtt.service';
import { JwtAuthGuard } from 'src/context/shared/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('device')
export class DeviceController {
  constructor(
    private readonly mqttService: MqttService,
    private readonly logsService: LogsService,
  ) {}

  @Get('status')
  getStatus() {
    return this.mqttService.getStatus();
  }

  @Get('admin-overview')
  async overview(@UserPayload() user: PayloadToken) {
    this.assertAdmin(user);
    const recentEvents = await this.logsService.search({
      page: 1,
      pageSize: 8,
    });
    return {
      status: this.mqttService.getStatus(),
      telemetry: this.mqttService.getLastTelemetry(),
      history: this.mqttService.getTelemetryHistory(),
      recentEvents: recentEvents.items,
    };
  }

  @Post('maintenance/enter')
  enterMaintenance(@UserPayload() user: PayloadToken) {
    this.assertAdmin(user);
    const status = this.mqttService.getStatus();
    if (!status.online)
      throw new ConflictException('El ESP32 está desconectado');
    if (status.treatmentRunning) {
      throw new ConflictException('Hay una sesión clínica activa');
    }
    return this.mqttService.publishCommandAndWait(
      'ENTER_MAINTENANCE',
      {},
      { actorUserId: user.sub, category: 'control' },
    );
  }

  @Post('maintenance/exit')
  exitMaintenance(@UserPayload() user: PayloadToken) {
    this.assertAdmin(user);
    return this.mqttService.publishCommandAndWait(
      'EXIT_MAINTENANCE',
      {},
      { actorUserId: user.sub, category: 'control' },
    );
  }

  @Post('emergency-stop')
  emergencyStop(@UserPayload() user: PayloadToken) {
    this.assertAdmin(user);
    return this.mqttService.publishCommandAndWait(
      'EMERGENCY_STOP',
      {},
      { actorUserId: user.sub, category: 'control' },
      4000,
    );
  }

  @Post('groups/:groupId/actuate')
  actuate(
    @UserPayload() user: PayloadToken,
    @Param('groupId') groupIdText: string,
    @Body()
    body: { pumpOn?: boolean; valveClosed?: boolean; durationMs?: number },
  ) {
    this.assertAdmin(user);
    const groupId = this.parseGroup(groupIdText);
    const status = this.assertMaintenanceReady();
    const durationMs = Math.min(
      Math.max(Number(body.durationMs) || 500, 100),
      5000,
    );
    if (body.pumpOn && body.valveClosed === false) {
      throw new BadRequestException('La bomba requiere la válvula cerrada');
    }
    return this.mqttService
      .publishCommandAndWait(
        'MANUAL_ACTUATE',
        {
          groupId,
          pumpOn: Boolean(body.pumpOn),
          valveClosed: Boolean(body.valveClosed),
          durationMs,
        },
        { actorUserId: user.sub, category: 'control', groupId },
        Math.max(4000, durationMs + 2500),
      )
      .then((ack) => ({ ack, status }));
  }

  @Post('groups/:groupId/diagnostic')
  diagnostic(
    @UserPayload() user: PayloadToken,
    @Param('groupId') groupIdText: string,
  ) {
    this.assertAdmin(user);
    const groupId = this.parseGroup(groupIdText);
    this.assertMaintenanceReady();
    return this.mqttService.publishCommandAndWait(
      'RUN_DIAGNOSTIC',
      { groupId },
      { actorUserId: user.sub, category: 'control', groupId },
      12_000,
    );
  }

  /** Compatibilidad limitada: ya no permite accionar actuadores arbitrariamente. */
  @Post('manual-command')
  manualCommand(
    @UserPayload() user: PayloadToken,
    @Body() body: { command: string; payload?: Record<string, unknown> },
  ) {
    this.assertAdmin(user);
    if (!['RESET', 'EMERGENCY_STOP'].includes(body.command)) {
      throw new BadRequestException(
        'Use los endpoints de mantenimiento tipados',
      );
    }
    return this.mqttService.publishCommandAndWait(
      body.command,
      body.payload ?? {},
      { actorUserId: user.sub, category: 'control' },
    );
  }

  private assertMaintenanceReady() {
    const status = this.mqttService.getStatus();
    if (!status.online)
      throw new ConflictException('El ESP32 está desconectado');
    if (status.treatmentRunning) {
      throw new ConflictException('Hay una sesión clínica activa');
    }
    if (!status.maintenanceMode) {
      throw new ConflictException('Active primero el modo mantenimiento');
    }
    return status;
  }

  private parseGroup(value: string) {
    const groupId = Number(value);
    if (!Number.isInteger(groupId) || groupId < 1 || groupId > 4) {
      throw new BadRequestException('El grupo debe estar entre 1 y 4');
    }
    return groupId;
  }

  private assertAdmin(user: PayloadToken) {
    if (!user || user.type !== 'admin') {
      throw new ForbiddenException('Sólo administradores');
    }
  }
}
