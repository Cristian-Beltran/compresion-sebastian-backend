// src/app/session/session.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../entities/session.entity';
import { SessionData } from '../entities/session-data.entity';
import { Patient } from '../../users/entities/patient.entity';
import { CreateSessionDto } from '../dtos/create-session.dto';
import { CreateSessionDataDto } from '../dtos/create-session-data.dto';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,

    @InjectRepository(SessionData)
    private readonly dataRepo: Repository<SessionData>,

    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
  ) {}

  /**
   * CREA una sesión para un paciente con la configuración del protocolo:
   * - targetPressure
   * - holdTimeSeconds
   * - restTimeSeconds (opcional)
   *
   * startedAt se setea por @CreateDateColumn en la entidad.
   */
  async createSession(dto: CreateSessionDto): Promise<Session> {
    const patient = await this.patientRepo.findOne({
      where: { id: dto.patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const session = this.sessionRepo.create({
      patient,
      targetPressure: dto.targetPressure,
      holdTimeSeconds: dto.holdTimeSeconds,
    });

    return await this.sessionRepo.save(session);
  }

  /**
   * CREA un registro de datos dentro de una sesión existente:
   * - measuredPressure
   * - temperature
   * - cycleIndex (opcional)
   *
   * recordedAt se setea por @CreateDateColumn en la entidad.
   */
  async addSessionData(
    sessionId: string,
    dto: CreateSessionDataDto,
  ): Promise<SessionData> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const record = this.dataRepo.create({
      session,
      measuredPressure: dto.measuredPressure,
      temperature: dto.temperature,
      cycleIndex: dto.cycleIndex,
    });

    return this.dataRepo.save(record);
  }

  /**
   * OBTIENE una sesión específica con:
   * - paciente
   * - todos sus registros ordenados por recordedAt ASC
   */
  async getSessionWithData(sessionId: string): Promise<Session> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['records', 'patient', 'patient.user'],
      order: {
        records: { recordedAt: 'ASC' },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  /**
   * LISTA todas las sesiones de un paciente (más sus registros y datos del paciente),
   * ordenadas:
   * - sesiones: startedAt DESC (últimas sesiones primero)
   * - registros: recordedAt ASC (evolución temporal dentro de cada sesión)
   */
  async findByPatient(patientId: string): Promise<Session[]> {
    const exists = await this.patientRepo.exist({
      where: { id: patientId },
    });

    if (!exists) {
      throw new NotFoundException('Patient not found');
    }

    const sessions = await this.sessionRepo.find({
      where: { patient: { id: patientId } },
      relations: ['records', 'patient', 'patient.user'],
      order: {
        startedAt: 'DESC',
        records: { recordedAt: 'ASC' },
      },
    });

    return sessions;
  }

  /**
   * LISTA todas las sesiones del sistema con:
   * - paciente
   * - registros
   * Orden:
   * - sesiones: startedAt DESC
   * - registros: recordedAt ASC
   */
  async getAll(): Promise<Session[]> {
    const sessions = await this.sessionRepo.find({
      relations: ['records', 'patient', 'patient.user'],
      order: {
        startedAt: 'DESC',
        records: { recordedAt: 'ASC' },
      },
    });

    return sessions;
  }
}
