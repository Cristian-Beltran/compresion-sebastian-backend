// src/app/session/entities/session-data.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Session } from './session.entity';

@Entity('session_data')
export class SessionData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Session, (session) => session.records, {
    onDelete: 'CASCADE',
  })
  session: Session;

  /**
   * Cada registro representa un punto de medición dentro de la sesión:
   * - measuredPressure: presión real leída en la banda
   * - temperature: temperatura del sensor / sistema para evitar sobrecalentamiento
   * - cycleIndex: opcional, identifica el ciclo dentro de la sesión
   */

  @Column('float')
  measuredPressure: number; // presión real medida en la banda

  @Column('float')
  temperature: number; // temperatura del sensor/sistema (°C)

  @Column('int', { nullable: true })
  cycleIndex?: number; // número de ciclo dentro de la sesión (0,1,2,...)

  @CreateDateColumn()
  recordedAt: Date;
}
