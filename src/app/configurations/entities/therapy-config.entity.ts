import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type IntensityType = 'low' | 'medium' | 'high';

@Entity('therapy_configs')
export class TherapyConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  intensity: IntensityType;

  @Column({ type: 'float' })
  targetPressureKpa: number;

  @Column({ type: 'int', default: 15 })
  inflateTimeSeconds: number;

  @Column({ type: 'int' })
  holdTimeSeconds: number;

  @Column({ type: 'int' })
  releaseTimeSeconds: number;

  @Column({ type: 'int' })
  cycleTarget: number;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
