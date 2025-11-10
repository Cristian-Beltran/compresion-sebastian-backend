// src/app/session/session.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SessionService } from '../services/session.service';
import { CreateSessionDto } from '../dtos/create-session.dto';
import { CreateSessionDataDto } from '../dtos/create-session-data.dto';

@Controller('sessions')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  /**
   * POST /sessions
   * Crea una sesión para un paciente con la configuración:
   * - patientId
   * - targetPressure
   * - holdTimeSeconds
   */
  @Post()
  createSession(@Body() dto: CreateSessionDto) {
    return this.sessionService.createSession(dto);
  }

  /**
   * POST /sessions/:id/data
   * Inserta un registro de datos en una sesión existente:
   * - measuredPressure
   * - temperature
   * - cycleIndex? (opcional)
   */
  @Post(':id/data')
  addData(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateSessionDataDto,
  ) {
    return this.sessionService.addSessionData(id, dto);
  }

  /**
   * GET /sessions
   * Lista todas las sesiones del sistema con:
   * - paciente
   * - registros de cada sesión
   */
  @Get()
  getAll() {
    return this.sessionService.getAll();
  }

  /**
   * GET /sessions/:id
   * Obtiene una sesión específica con:
   * - paciente
   * - todos sus registros
   */
  @Get(':id')
  getOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.sessionService.getSessionWithData(id);
  }

  /**
   * GET /sessions/by-patient/:patientId
   * Lista todas las sesiones de un paciente con:
   * - datos del paciente
   * - registros de cada sesión
   */
  @Get('by-patient/:patientId')
  findByPatient(
    @Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string,
  ) {
    return this.sessionService.findByPatient(patientId);
  }
}
