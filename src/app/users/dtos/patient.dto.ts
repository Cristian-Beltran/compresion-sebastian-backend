// src/app/user/dto/create-patient.dto.ts
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CreateUserBaseDto } from './user.dto';

export class CreatePatientDto extends CreateUserBaseDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  age?: number;

  @IsOptional()
  @IsIn(['masculino', 'femenino', 'otro'])
  sex?: 'masculino' | 'femenino' | 'otro';

  @IsOptional()
  @IsString()
  treatedLimb?: string;

  @IsOptional()
  @IsIn(['independiente', 'movilidad_reducida', 'inmovil'])
  mobilityLevel?: 'independiente' | 'movilidad_reducida' | 'inmovil';
}
