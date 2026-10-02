import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SensorType = 'pressure' | 'force';
export type CalibrationStatus = 'pending' | 'zeroed' | 'completed' | 'failed';

@Entity('sensor_calibrations')
export class SensorCalibration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', default: 'esp32-01' })
  deviceId: string;

  @Column({ type: 'int' })
  groupId: number;

  @Column({ type: 'text' })
  sensorType: SensorType;

  @Column({ type: 'text', default: 'pending' })
  status: CalibrationStatus;

  @Column({ type: 'float', nullable: true })
  zeroRaw?: number | null;

  @Column({ type: 'float', nullable: true })
  referenceRaw?: number | null;

  @Column({ type: 'float', nullable: true })
  referenceValue?: number | null;

  @Column({ type: 'text', nullable: true })
  referenceUnit?: string | null;

  @Column({ type: 'float', nullable: true })
  priorCoefficient?: number | null;

  @Column({ type: 'float', nullable: true })
  coefficient?: number | null;

  @Column({ type: 'text' })
  actorUserId: string;

  @Column({ type: 'text', nullable: true })
  requestId?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'text', nullable: true })
  failureReason?: string | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt?: Date | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
