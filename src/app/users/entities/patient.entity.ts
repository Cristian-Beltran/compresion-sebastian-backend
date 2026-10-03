// src/app/user/entities/patient.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  ManyToMany,
  Column,
} from 'typeorm';
import { User } from './user.entity';
import { FamilyMember } from './family.entity';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { eager: true })
  @JoinColumn()
  user: User;

  @ManyToMany(() => FamilyMember, (family) => family.patients)
  familyMembers: FamilyMember[];

  @Column({ type: 'int', nullable: true })
  age?: number;

  @Column({ type: 'varchar', length: 30, nullable: true })
  sex?: 'masculino' | 'femenino' | 'otro';

  @Column({ type: 'varchar', length: 30, nullable: true })
  document?: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  diagnosis?: string;
}
