import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ConfigurationsService } from './configurations.service';
import { IntensityType } from './entities/therapy-config.entity';

@Controller('configurations')
export class ConfigurationsController {
  constructor(private readonly configurationsService: ConfigurationsService) {}

  @Get()
  findAll() {
    return this.configurationsService.findAll();
  }

  @Patch(':intensity')
  update(
    @Param('intensity') intensity: IntensityType,
    @Body()
    body: {
      targetPressureKpa?: number;
      inflateTimeSeconds?: number;
      holdTimeSeconds?: number;
      releaseTimeSeconds?: number;
      cycleTarget?: number;
    },
  ) {
    return this.configurationsService.update(intensity, body);
  }
}
