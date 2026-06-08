// src/app/user/services/patient.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Patient } from '../entities/patient.entity';
import { CreatePatientDto } from '../dtos/patient.dto';
import { UserBaseService } from './users.service';
import { UserType } from '../enums/user-type';
import { Status } from '../../../context/shared/models/active.model';

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    private readonly userBaseService: UserBaseService,
  ) {}

  async create(dto: CreatePatientDto): Promise<Patient> {
    dto.type = UserType.PATIENT;
    dto.status = Status.ACTIVE;
    const slug = dto.fullname.toLowerCase().trim().replace(/\s+/g, '.');

    const user = await this.userBaseService.createUser({
      fullname: dto.fullname,
      email: dto.email ?? `${slug}.${Date.now()}@patient.local`,
      password: dto.password ?? 'Patient123*',
      address: dto.address ?? 'N/A',
      type: UserType.PATIENT,
      status: Status.ACTIVE,
    });
    const patient = this.patientRepository.create({
      user,
      age: dto.age,
      sex: dto.sex,
    });
    return this.patientRepository.save(patient);
  }

  async findAll(): Promise<Patient[]> {
    return this.patientRepository.find({
      relations: ['user'],
      where: { user: { status: Not(Status.DELETED) } },
    });
  }

  async findOne(id: string): Promise<Patient> {
    const patient = await this.patientRepository.findOne({
      where: [{ id }, { user: { id } }],
      relations: ['user'],
    });
    if (!patient) throw new NotFoundException(`Patient ${id} not found`);
    return patient;
  }

  async update(id: string, dto: Partial<CreatePatientDto>): Promise<Patient> {
    const patient = await this.findOne(id);
    await this.userBaseService.updateUser(patient.user.id, {
      fullname: dto.fullname,
      email: dto.email,
      address: dto.address,
    });

    if (dto.age !== undefined) {
      patient.age = dto.age;
    }
    if (dto.sex !== undefined) {
      patient.sex = dto.sex;
    }
    await this.patientRepository.save(patient);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const patient = await this.findOne(id);
    await this.userBaseService.removeUser(patient.user.id);
  }

  async findOneOrThrow(id: string): Promise<Patient> {
    const patient = await this.patientRepository.findOne({
      where: { id },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }
  async updateStatus(id: string, status: Status): Promise<Patient> {
    const patient = await this.findOne(id);
    await this.userBaseService.updateStatus(patient.user.id, status);
    return await this.findOne(id);
  }
}
