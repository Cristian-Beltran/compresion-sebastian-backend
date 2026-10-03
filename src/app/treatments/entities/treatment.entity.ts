import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type TreatmentStatus = 'running' | 'completed' | 'aborted' | 'interrupted';
export type TreatmentIntensity = 'low' | 'medium' | 'high' | 'custom';
export type TreatmentZone =
  | 'pantorrilla_izquierda'
  | 'pantorrilla_derecha'
  | 'pie_izquierdo'
  | 'pie_derecho';
export type MobilityLevel = 'independiente' | 'movilidad_reducida' | 'inmovil';

export type TreatmentGroupConfig = {
  groupId: 1 | 2 | 3 | 4;
  zone: TreatmentZone;
  intensity: TreatmentIntensity;
  targetPressureKpa: number;
  inflateTimeSeconds: number;
  holdTimeSeconds: number;
  releaseTimeSeconds: number;
  cycleTarget: number;
  cycleCount?: number;
};

@Entity('treatments')
export class TreatmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  patientId: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  configId?: string | null;

  @Column({ type: 'varchar', length: 20 })
  intensity: TreatmentIntensity;

  @Column({ type: 'varchar', length: 30 })
  treatmentZone: TreatmentZone;

  @Column({ type: 'varchar', length: 30 })
  mobilityLevel: MobilityLevel;

  @Column({ type: 'float', nullable: true })
  targetPressureKpa?: number | null;

  @Column({ type: 'int', nullable: true })
  holdTimeSeconds?: number | null;

  @Column({ type: 'int', nullable: true })
  releaseTimeSeconds?: number | null;

  @Column({ type: 'int', nullable: true })
  cycleTarget?: number | null;

  /** Configuración independiente de los grupos seleccionados (1..4).
   * Nullable mantiene compatibles todos los tratamientos históricos.
   */
  @Column({ type: 'simple-json', nullable: true })
  groups?: TreatmentGroupConfig[] | null;

  @CreateDateColumn({ type: 'datetime' })
  startedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  endedAt: Date | null;

  @Column({ type: 'int', default: 0 })
  cycleCount: number;

  @Column({ type: 'text', nullable: true })
  medicalReport?: string | null;

  @Column({ type: 'varchar', length: 20, default: 'running' })
  status: TreatmentStatus;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
