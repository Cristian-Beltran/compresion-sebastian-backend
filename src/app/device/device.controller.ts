import { Body, Controller, Get, Post } from '@nestjs/common';
import { MqttService } from '../mqtt/mqtt.service';

@Controller('device')
export class DeviceController {
  constructor(private readonly mqttService: MqttService) {}

  @Get('status')
  getStatus() {
    return this.mqttService.getStatus();
  }

  @Post('manual-command')
  manualCommand(
    @Body() body: { command: string; payload?: Record<string, unknown> },
  ) {
    return this.mqttService.publishCommand(body.command, body.payload ?? {});
  }
}
