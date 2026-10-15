// src/app/user/entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserType } from '../enums/user-type';
import { Status } from '../../../context/shared/models/active.model';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullname: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ type: 'text' })
  type: UserType;

  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'text' })
  status: Status;

  /** Perfil de parámetros que cada médico reutiliza sin alterar protocolos globales. */
  @Column({ type: 'simple-json', nullable: true })
  customTherapyProfile?: Record<string, unknown> | null;
}
