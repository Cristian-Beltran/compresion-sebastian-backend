// src/app/session/dto/create-session-data.dto.ts
import { IsNumber, IsInt, Min, IsOptional } from 'class-validator';

export class CreateSessionDataDto {
  // Presión real medida en la banda (unidad que uses en el ESP)
  @IsNumber()
  measuredPressure: number;

  // Temperatura del sensor/sistema (°C, por ejemplo)
  @IsNumber()
  temperature: number;

  // Número de ciclo dentro de la sesión (0, 1, 2, ...)
  @IsOptional()
  @IsInt()
  @Min(0)
  cycleIndex?: number;
}
