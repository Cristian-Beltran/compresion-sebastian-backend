import { IsOptional, IsString } from 'class-validator';
import { CreateUserBaseDto } from './user.dto';

export class CreateTechnicalDto extends CreateUserBaseDto {
  @IsString()
  @IsOptional()
  specialty?: string;

  @IsString()
  @IsOptional()
  licenseNumber?: string;
}
