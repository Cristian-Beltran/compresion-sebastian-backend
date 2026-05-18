import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  severity: 'info' | 'warn' | 'critical';

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
