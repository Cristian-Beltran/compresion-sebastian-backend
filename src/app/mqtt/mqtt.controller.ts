import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserPayload } from 'src/context/shared/decorators/user.decorator';
import { PayloadToken } from 'src/context/shared/models/token.model';
import { JwtAuthGuard } from 'src/context/shared/guards/jwt-auth.guard';
import { MqttService } from './mqtt.service';

@UseGuards(JwtAuthGuard)
@Controller('mqtt')
export class MqttController {
  constructor(private readonly mqttService: MqttService) {}

  @Get('status')
  status() {
    return {
      status: this.mqttService.getStatus(),
      telemetry: this.mqttService.getLastTelemetry(),
      history: this.mqttService.getTelemetryHistory(),
    };
  }

  @Post('command')
  command(
    @UserPayload() user: PayloadToken,
    @Body() body: { command: string; payload?: Record<string, unknown> },
  ) {
    if (!user || user.type !== 'admin') {
      throw new ForbiddenException('Sólo administradores');
    }
    if (!['RESET', 'EMERGENCY_STOP'].includes(body.command)) {
      throw new BadRequestException('Use los endpoints tipados de device');
    }
    return this.mqttService.publishCommandAndWait(
      body.command,
      body.payload ?? {},
      { actorUserId: user.sub, category: 'control' },
    );
  }
}
