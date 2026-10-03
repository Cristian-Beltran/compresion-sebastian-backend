import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  ParseUUIDPipe,
  Put,
  Patch,
} from '@nestjs/common';
import { TechnicalService } from '../services/technical.service';
import { CreateTechnicalDto } from '../dtos/technical.dto';
import { JwtAuthGuard } from 'src/context/shared/guards/jwt-auth.guard';
import { Status } from 'src/context/shared/models/active.model';

@UseGuards(JwtAuthGuard)
@Controller('technicals')
export class TechnicalController {
  constructor(private readonly technicalService: TechnicalService) {}

  @Post()
  create(@Body() dto: CreateTechnicalDto) {
    return this.technicalService.create(dto);
  }

  @Get()
  findAll() {
    return this.technicalService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.technicalService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: Partial<CreateTechnicalDto>,
  ) {
    return this.technicalService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.technicalService.remove(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: { status: Status },
  ) {
    return this.technicalService.updateStatus(id, dto.status);
  }
}
