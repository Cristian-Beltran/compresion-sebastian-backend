import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogsService } from '../logs/logs.service';
import { MqttService } from '../mqtt/mqtt.service';
import {
  SensorCalibration,
  SensorType,
} from './entities/sensor-calibration.entity';

type TareInput = {
  groupId: number;
  sensorType: SensorType;
  notes?: string;
};

type ReferenceInput = {
  calibrationId: string;
  referenceValue: number;
  referenceUnit: 'kPa' | 'N' | 'kg';
  notes?: string;
};

@Injectable()
export class CalibrationsService {
  constructor(
    @InjectRepository(SensorCalibration)
    private readonly calibrationRepo: Repository<SensorCalibration>,
    private readonly mqttService: MqttService,
    private readonly logsService: LogsService,
  ) {}

  async findAll(
    page = 1,
    pageSize = 20,
    groupId?: number,
    sensorType?: string,
  ) {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeSize = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const builder = this.calibrationRepo
      .createQueryBuilder('calibration')
      .orderBy('calibration.createdAt', 'DESC')
      .skip((safePage - 1) * safeSize)
      .take(safeSize);
    if (groupId)
      builder.andWhere('calibration.groupId = :groupId', { groupId });
    if (sensorType && sensorType !== 'all') {
      builder.andWhere('calibration.sensorType = :sensorType', { sensorType });
    }
    const [items, total] = await builder.getManyAndCount();
    return { items, total, page: safePage, pageSize: safeSize };
  }

  async findLatest() {
    const completed = await this.calibrationRepo.find({
      where: { status: 'completed' },
      order: { completedAt: 'DESC' },
    });
    const latest = new Map<string, SensorCalibration>();
    for (const item of completed) {
      const key = `${item.groupId}:${item.sensorType}`;
      if (!latest.has(key)) latest.set(key, item);
    }
    return Array.from(latest.values());
  }

  async tare(input: TareInput, actorUserId: string) {
    this.assertSensorInput(input.groupId, input.sensorType);
    this.assertMaintenanceReady();
    const row = await this.calibrationRepo.save(
      this.calibrationRepo.create({
        deviceId: 'esp32-01',
        groupId: input.groupId,
        sensorType: input.sensorType,
        status: 'pending',
        actorUserId,
        notes: input.notes,
      }),
    );

    try {
      const ack = await this.mqttService.publishCommandAndWait(
        'TARE_SENSOR',
        { groupId: input.groupId, sensorType: input.sensorType },
        {
          actorUserId,
          category: 'calibration',
          groupId: input.groupId,
        },
      );
      if (!['accepted', 'ok'].includes(String(ack.result))) {
        throw new ConflictException(`El ESP rechazó el cero: ${ack.result}`);
      }
      row.status = 'zeroed';
      row.zeroRaw = Number(ack.zeroRaw ?? ack.rawMean ?? 0);
      row.priorCoefficient = Number(ack.priorCoefficient ?? 0) || null;
      row.requestId = ack.requestId;
      row.metadata = ack;
      await this.calibrationRepo.save(row);
      await this.logsService.create({
        level: 'info',
        source: 'calibration',
        category: 'calibration',
        eventType: 'calibration_zeroed',
        groupId: row.groupId,
        actorUserId,
        requestId: ack.requestId,
        message: `Cero registrado para sensor ${row.sensorType} del grupo ${row.groupId}`,
        metadata: ack,
      });
      return row;
    } catch (error) {
      row.status = 'failed';
      row.failureReason =
        error instanceof Error ? error.message : 'Error desconocido';
      await this.calibrationRepo.save(row);
      throw error;
    }
  }

  async calibrateReference(input: ReferenceInput, actorUserId: string) {
    const row = await this.calibrationRepo.findOne({
      where: { id: input.calibrationId },
    });
    if (!row) throw new NotFoundException('Calibración no encontrada');
    if (row.status !== 'zeroed') {
      throw new ConflictException('La calibración debe estar puesta a cero');
    }
    if (row.actorUserId !== actorUserId) {
      throw new ConflictException(
        'La calibración debe completarla el mismo usuario',
      );
    }
    this.assertMaintenanceReady();
    const normalizedValue = this.normalizeReference(
      row.sensorType,
      Number(input.referenceValue),
      input.referenceUnit,
    );

    try {
      const ack = await this.mqttService.publishCommandAndWait(
        'CALIBRATE_SENSOR',
        {
          groupId: row.groupId,
          sensorType: row.sensorType,
          referenceValue: normalizedValue,
        },
        {
          actorUserId,
          category: 'calibration',
          groupId: row.groupId,
        },
      );
      if (!['accepted', 'ok'].includes(String(ack.result))) {
        throw new ConflictException(
          `El ESP rechazó la referencia: ${ack.result}`,
        );
      }
      row.status = 'completed';
      row.referenceValue = normalizedValue;
      row.referenceUnit = row.sensorType === 'pressure' ? 'kPa' : 'N';
      row.referenceRaw = Number(ack.referenceRaw ?? ack.rawMean ?? 0);
      row.priorCoefficient = Number(
        ack.priorCoefficient ?? row.priorCoefficient ?? 0,
      );
      row.coefficient = Number(ack.coefficient ?? 0);
      row.notes = input.notes ?? row.notes;
      row.requestId = ack.requestId;
      row.metadata = ack;
      row.completedAt = new Date();
      await this.calibrationRepo.save(row);
      await this.logsService.create({
        level: 'info',
        source: 'calibration',
        category: 'calibration',
        eventType: 'calibration_completed',
        groupId: row.groupId,
        actorUserId,
        requestId: ack.requestId,
        message: `Calibración completada para sensor ${row.sensorType} del grupo ${row.groupId}`,
        metadata: {
          coefficient: row.coefficient,
          priorCoefficient: row.priorCoefficient,
          referenceValue: row.referenceValue,
          referenceUnit: row.referenceUnit,
        },
      });
      return row;
    } catch (error) {
      row.status = 'failed';
      row.failureReason =
        error instanceof Error ? error.message : 'Error desconocido';
      await this.calibrationRepo.save(row);
      throw error;
    }
  }

  async reapply(id: string, actorUserId: string) {
    const row = await this.calibrationRepo.findOne({ where: { id } });
    if (!row || row.status !== 'completed' || !row.coefficient) {
      throw new NotFoundException('Calibración completa no encontrada');
    }
    this.assertMaintenanceReady();
    const ack = await this.mqttService.publishCommandAndWait(
      'APPLY_CALIBRATION',
      {
        groupId: row.groupId,
        sensorType: row.sensorType,
        zeroRaw: row.zeroRaw,
        coefficient: row.coefficient,
      },
      {
        actorUserId,
        category: 'calibration',
        groupId: row.groupId,
      },
    );
    return { calibration: row, ack };
  }

  private assertMaintenanceReady() {
    const status = this.mqttService.getStatus();
    if (!status.online)
      throw new ConflictException('El ESP32 está desconectado');
    if (status.treatmentRunning) {
      throw new ConflictException('No se puede calibrar durante una sesión');
    }
    if (!status.maintenanceMode) {
      throw new ConflictException('Active primero el modo mantenimiento');
    }
  }

  private assertSensorInput(groupId: number, sensorType: string) {
    if (!Number.isInteger(groupId) || groupId < 1 || groupId > 4) {
      throw new BadRequestException('groupId debe estar entre 1 y 4');
    }
    if (!['pressure', 'force'].includes(sensorType)) {
      throw new BadRequestException('sensorType debe ser pressure o force');
    }
  }

  private normalizeReference(
    sensorType: SensorType,
    value: number,
    unit: string,
  ) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException('La referencia debe ser mayor a cero');
    }
    if (sensorType === 'pressure') {
      if (unit !== 'kPa' || value > 40) {
        throw new BadRequestException('La presión debe estar entre 0 y 40 kPa');
      }
      return value;
    }
    const newtons = unit === 'kg' ? value * 9.80665 : value;
    if (!['kg', 'N'].includes(unit) || newtons > 500) {
      throw new BadRequestException('La fuerza debe estar entre 0 y 500 N');
    }
    return newtons;
  }
}
