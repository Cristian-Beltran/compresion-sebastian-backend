import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Technical } from '../entities/technical.entity';
import { CreateTechnicalDto } from '../dtos/technical.dto';
import { UserBaseService } from './users.service';
import { UserType } from '../enums/user-type';
import { Status } from '../../../context/shared/models/active.model';

@Injectable()
export class TechnicalService {
  constructor(
    @InjectRepository(Technical)
    private readonly technicalRepository: Repository<Technical>,
    private readonly userBaseService: UserBaseService,
  ) {}

  async create(dto: CreateTechnicalDto): Promise<Technical> {
    const user = await this.userBaseService.createUser({
      fullname: dto.fullname,
      email: dto.email,
      address: dto.address,
      password: dto.password,
      type: UserType.TECHNICAL,
      status: Status.ACTIVE,
    });
    const technical = this.technicalRepository.create({
      user,
      specialty: dto.specialty,
      licenseNumber: dto.licenseNumber,
    });
    return this.technicalRepository.save(technical);
  }

  async findAll(): Promise<Technical[]> {
    return this.technicalRepository.find({
      relations: ['user'],
      where: { user: { status: Not(Status.DELETED) } },
    });
  }

  async findOne(id: string): Promise<Technical> {
    const technical = await this.technicalRepository.findOne({
      where: { user: { id } },
      relations: ['user'],
    });
    if (!technical) throw new NotFoundException(`Technical ${id} not found`);
    return technical;
  }

  async update(id: string, dto: Partial<CreateTechnicalDto>): Promise<Technical> {
    const technical = await this.findOne(id);
    await this.userBaseService.updateUser(technical.user.id, {
      fullname: dto.fullname,
      email: dto.email,
      address: dto.address,
    });

    Object.assign(technical, {
      specialty: dto.specialty ?? technical.specialty,
      licenseNumber: dto.licenseNumber ?? technical.licenseNumber,
    });

    await this.technicalRepository.save(technical);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const technical = await this.findOne(id);
    await this.userBaseService.removeUser(technical.user.id);
  }

  async findByEmail(email: string): Promise<Technical> {
    const technical = await this.technicalRepository.findOne({
      where: { user: { email } },
      relations: ['user'],
    });
    return technical;
  }

  async updateStatus(id: string, status: Status): Promise<Technical> {
    await this.userBaseService.updateStatus(id, status);
    return await this.findOne(id);
  }
}
