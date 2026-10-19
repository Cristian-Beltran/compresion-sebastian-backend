import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** A sampled sensor value for one compressor group during a treatment. */
@Entity('treatment_telemetry')
@Index(['treatmentId', 'recordedAt'])
export class TreatmentTelemetryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  treatmentId: string;

  @Column({ type: 'int' })
  groupId: number;

  @Column({ type: 'float' })
  pressureKpa: number;

  @Column({ type: 'float' })
  forceNewtons: number;

  @CreateDateColumn({ type: 'datetime' })
  recordedAt: Date;
}
