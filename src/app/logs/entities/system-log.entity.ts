import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('system_logs')
export class SystemLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  level: 'info' | 'warn' | 'error';

  @Column({ type: 'text' })
  source: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text', nullable: true })
  category?: string | null;

  @Column({ type: 'text', nullable: true })
  eventType?: string | null;

  @Column({ type: 'text', nullable: true })
  deviceId?: string | null;

  @Column({ type: 'int', nullable: true })
  groupId?: number | null;

  @Column({ type: 'text', nullable: true })
  treatmentId?: string | null;

  @Column({ type: 'text', nullable: true })
  actorUserId?: string | null;

  @Column({ type: 'text', nullable: true })
  actorRole?: string | null;

  @Column({ type: 'text', nullable: true })
  requestId?: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
