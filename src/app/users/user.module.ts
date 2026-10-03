import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/app/users/entities/user.entity';
import { FamilyMemberController } from './api/family.controller';
import { DoctorController } from './api/doctor.controller';
import { TechnicalController } from './api/technical.controller';
import { PatientController } from './api/patient.controller';
import { AdminUsersController } from './api/admin-users.controller';
import { UserBaseService } from './services/users.service';
import { FamilyMemberService } from './services/family.service';
import { DoctorService } from './services/doctor.service';
import { TechnicalService } from './services/technical.service';
import { PatientService } from './services/patient.service';
import { Doctor } from './entities/doctor.entity';
import { Technical } from './entities/technical.entity';
import { FamilyMember } from './entities/family.entity';
import { Patient } from './entities/patient.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Doctor, Technical, FamilyMember, Patient])],
  controllers: [
    FamilyMemberController,
    DoctorController,
    TechnicalController,
    PatientController,
    AdminUsersController,
  ],
  providers: [
    UserBaseService,
    FamilyMemberService,
    DoctorService,
    TechnicalService,
    PatientService,
  ],
  exports: [
    UserBaseService,
    FamilyMemberService,
    DoctorService,
    TechnicalService,
    PatientService,
  ],
})
export class UsersModule {}
