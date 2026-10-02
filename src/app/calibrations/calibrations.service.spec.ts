import { Repository } from 'typeorm';
import { LogsService } from '../logs/logs.service';
import { MqttService } from '../mqtt/mqtt.service';
import { CalibrationsService } from './calibrations.service';
import { SensorCalibration } from './entities/sensor-calibration.entity';

describe('CalibrationsService safety and persistence', () => {
  const repository = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({
      id: value.id ?? 'calibration-1',
      ...value,
    })),
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const mqtt = {
    getStatus: jest.fn(() => ({
      online: true,
      maintenanceMode: true,
      treatmentRunning: false,
    })),
    publishCommandAndWait: jest.fn(),
  };
  const logs = { create: jest.fn(async (value) => value) };
  let service: CalibrationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CalibrationsService(
      repository as unknown as Repository<SensorCalibration>,
      mqtt as unknown as MqttService,
      logs as unknown as LogsService,
    );
  });

  it('records a confirmed pressure tare', async () => {
    mqtt.publishCommandAndWait.mockResolvedValue({
      result: 'accepted',
      requestId: 'request-1',
      zeroRaw: 12345,
      priorCoefficient: 220000,
    });

    const result = await service.tare(
      { groupId: 2, sensorType: 'pressure' },
      'admin-1',
    );

    expect(result).toEqual(
      expect.objectContaining({
        groupId: 2,
        status: 'zeroed',
        zeroRaw: 12345,
        actorUserId: 'admin-1',
      }),
    );
  });

  it('blocks calibration outside maintenance mode', async () => {
    mqtt.getStatus.mockReturnValueOnce({
      online: true,
      maintenanceMode: false,
      treatmentRunning: false,
    });

    await expect(
      service.tare({ groupId: 1, sensorType: 'force' }, 'admin-1'),
    ).rejects.toThrow('Active primero el modo mantenimiento');
    expect(mqtt.publishCommandAndWait).not.toHaveBeenCalled();
  });

  it('normalizes a kilogram reference to newtons and saves the coefficient', async () => {
    repository.findOne.mockResolvedValue({
      id: 'calibration-1',
      groupId: 3,
      sensorType: 'force',
      status: 'zeroed',
      actorUserId: 'admin-1',
      zeroRaw: 1800,
    });
    mqtt.publishCommandAndWait.mockResolvedValue({
      result: 'accepted',
      requestId: 'request-2',
      rawMean: 1200,
      coefficient: 1.25,
      priorCoefficient: 1,
    });

    const result = await service.calibrateReference(
      {
        calibrationId: 'calibration-1',
        referenceValue: 2,
        referenceUnit: 'kg',
      },
      'admin-1',
    );

    expect(mqtt.publishCommandAndWait).toHaveBeenCalledWith(
      'CALIBRATE_SENSOR',
      expect.objectContaining({ referenceValue: 19.6133 }),
      expect.any(Object),
    );
    expect(result).toEqual(
      expect.objectContaining({ status: 'completed', coefficient: 1.25 }),
    );
  });
});
