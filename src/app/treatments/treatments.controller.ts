import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { StartTreatmentDto, TreatmentsService } from './treatments.service';
import { UserPayload } from 'src/context/shared/decorators/user.decorator';
import { PayloadToken } from 'src/context/shared/models/token.model';

@Controller('treatments')
export class TreatmentsController {
  constructor(private readonly treatmentsService: TreatmentsService) {}

  @Get()
  findAll() {
    return this.treatmentsService.findAll();
  }

  @Post('start')
  start(@UserPayload() user: PayloadToken, @Body() dto: StartTreatmentDto) {
    return this.treatmentsService.start(dto, user?.sub);
  }

  @Post(':id/stop')
  stop(@UserPayload() user: PayloadToken, @Param('id') id: string) {
    return this.treatmentsService.stop(id, user?.sub);
  }
}
