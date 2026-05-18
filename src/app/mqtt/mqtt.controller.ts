import { Body, Controller, Get, Post } from '@nestjs/common';
import { MqttService } from './mqtt.service';

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
    @Body() body: { command: string; payload?: Record<string, unknown> },
  ) {
    return this.mqttService.publishCommand(body.command, body.payload ?? {});
  }
}
