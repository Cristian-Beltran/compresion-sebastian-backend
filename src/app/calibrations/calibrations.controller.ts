import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserPayload } from 'src/context/shared/decorators/user.decorator';
import { PayloadToken } from 'src/context/shared/models/token.model';
import { CalibrationsService } from './calibrations.service';
import { SensorType } from './entities/sensor-calibration.entity';
import { JwtAuthGuard } from 'src/context/shared/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('calibrations')
export class CalibrationsController {
  constructor(private readonly calibrationsService: CalibrationsService) {}

  @Get()
  findAll(
    @UserPayload() user: PayloadToken,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('groupId') groupId?: string,
    @Query('sensorType') sensorType?: string,
  ) {
    this.assertAdminOrTechnical(user);
    return this.calibrationsService.findAll(
      Number(page) || 1,
      Number(pageSize) || 20,
      groupId ? Number(groupId) : undefined,
      sensorType,
    );
  }

  @Get('latest')
  latest(@UserPayload() user: PayloadToken) {
    this.assertAdminOrTechnical(user);
    return this.calibrationsService.findLatest();
  }

  @Post('tare')
  tare(
    @UserPayload() user: PayloadToken,
    @Body() body: { groupId: number; sensorType: SensorType; notes?: string },
  ) {
    this.assertAdminOrTechnical(user);
    return this.calibrationsService.tare(body, user.sub);
  }

  @Post('reference')
  reference(
    @UserPayload() user: PayloadToken,
    @Body()
    body: {
      calibrationId: string;
      referenceValue: number;
      referenceUnit: 'kPa' | 'N' | 'kg';
      notes?: string;
    },
  ) {
    this.assertAdminOrTechnical(user);
    return this.calibrationsService.calibrateReference(body, user.sub);
  }

  @Post(':id/reapply')
  reapply(@UserPayload() user: PayloadToken, @Param('id') id: string) {
    this.assertAdminOrTechnical(user);
    return this.calibrationsService.reapply(id, user.sub);
  }

  private assertAdminOrTechnical(user: PayloadToken) {
    if (!user || !['admin', 'technical'].includes(user.type)) {
      throw new ForbiddenException('Sólo administradores o técnicos');
    }
  }
}
