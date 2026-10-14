import { Body, Controller, ForbiddenException, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ConfigurationsService } from './configurations.service';
import { IntensityType } from './entities/therapy-config.entity';
import { JwtAuthGuard } from 'src/context/shared/guards/jwt-auth.guard';
import { UserPayload } from 'src/context/shared/decorators/user.decorator';
import { PayloadToken } from 'src/context/shared/models/token.model';
import { UserType } from '../users/enums/user-type';

@UseGuards(JwtAuthGuard)
@Controller('configurations')
export class ConfigurationsController {
  constructor(private readonly configurationsService: ConfigurationsService) {}

  @Get()
  findAll() {
    return this.configurationsService.findAll();
  }

  @Patch(':intensity')
  update(
    @UserPayload() user: PayloadToken,
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
    if (![UserType.ADMIN, UserType.TECHNICAL].includes(user.type)) {
      throw new ForbiddenException('Solo personal técnico puede editar perfiles');
    }
    return this.configurationsService.update(intensity, body, user.email);
  }
}
