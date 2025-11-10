// src/app/session/dto/create-session.dto.ts
import { IsUUID, IsNumber, IsInt, Min, IsOptional } from 'class-validator';

export class CreateSessionDto {
  @IsUUID()
  patientId: string;

  // Presión objetivo que el ESP debe alcanzar en la banda (ej: mmHg)
  @IsNumber()
  @Min(0)
  targetPressure: number;

  // Tiempo que se mantiene la presión objetivo (en segundos)
  @IsInt()
  @Min(1)
  holdTimeSeconds: number;
}
