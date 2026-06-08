// src/app/user/dto/create-patient.dto.ts
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { UserType } from '../enums/user-type';
import { Status } from '../../../context/shared/models/active.model';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  fullname: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(UserType)
  type?: UserType;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  age?: number;

  @IsOptional()
  @IsIn(['masculino', 'femenino', 'otro'])
  sex?: 'masculino' | 'femenino' | 'otro';
}
