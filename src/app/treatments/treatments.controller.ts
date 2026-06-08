import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { StartTreatmentDto, TreatmentsService } from './treatments.service';

@Controller('treatments')
export class TreatmentsController {
  constructor(private readonly treatmentsService: TreatmentsService) {}

  @Get()
  findAll() {
    return this.treatmentsService.findAll();
  }

  @Post('start')
  start(@Body() dto: StartTreatmentDto) {
    return this.treatmentsService.start(dto);
  }

  @Post(':id/stop')
  stop(@Param('id') id: string) {
    return this.treatmentsService.stop(id);
  }
}
