import { Repository } from 'typeorm';
import { MqttService } from '../mqtt/mqtt.service';
import { TreatmentEntity } from './entities/treatment.entity';
import { TreatmentsService } from './treatments.service';
import { LogsService } from '../logs/logs.service';

describe('TreatmentsService multi-group sessions', () => {
  const mqtt = {
    getStatus: jest.fn(() => ({
      groups: [],
      online: true,
      brokerConnected: true,
    })),
    publishCommand: jest.fn(),
    publishCommandAndWait: jest.fn(async () => ({
      result: 'accepted',
      requestId: 'request-1',
    })),
  };
  const repository = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'treatment-1', ...value })),
  };
  const logs = {
    create: jest.fn(async (value) => value),
  };

  let service: TreatmentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findOne.mockResolvedValue(null);
    service = new TreatmentsService(
      mqtt as unknown as MqttService,
      repository as unknown as Repository<TreatmentEntity>,
      logs as unknown as LogsService,
    );
  });

  it('persists one session and publishes independent configuration for four channels', async () => {
    const result = await service.start({
      patientId: 'patient-1',
      intensity: 'custom',
      mobilityLevel: 'independiente',
      groups: [
        {
          groupId: 1,
          zone: 'pantorrilla_izquierda',
          intensity: 'medium',
          targetPressureKpa: 5,
          inflateTimeSeconds: 8,
          holdTimeSeconds: 10,
          releaseTimeSeconds: 5,
          cycleTarget: 8,
        },
        {
          groupId: 4,
          zone: 'pie_derecho',
          intensity: 'custom',
          targetPressureKpa: 6,
          inflateTimeSeconds: 9,
          holdTimeSeconds: 11,
          releaseTimeSeconds: 6,
          cycleTarget: 9,
        },
      ],
    });

    expect(result.groups).toHaveLength(2);
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        groups: expect.arrayContaining([
          expect.objectContaining({ groupId: 1 }),
          expect.objectContaining({ groupId: 4 }),
        ]),
      }),
    );
    expect(mqtt.publishCommand).toHaveBeenCalledTimes(4);
    expect(mqtt.publishCommandAndWait).toHaveBeenCalledWith(
      'START_TREATMENT',
      { treatmentId: 'treatment-1', activeMask: 9 },
      expect.objectContaining({ treatmentId: 'treatment-1' }),
    );
  });

  it('rejects repeated compressor groups', async () => {
    await expect(
      service.start({
        patientId: 'patient-1',
        intensity: 'custom',
        mobilityLevel: 'independiente',
        groups: [
          {
            groupId: 1,
            zone: 'pantorrilla_izquierda',
            intensity: 'custom',
            targetPressureKpa: 5,
            inflateTimeSeconds: 8,
            holdTimeSeconds: 10,
            releaseTimeSeconds: 5,
            cycleTarget: 8,
          },
          {
            groupId: 1,
            zone: 'pie_izquierdo',
            intensity: 'custom',
            targetPressureKpa: 5,
            inflateTimeSeconds: 8,
            holdTimeSeconds: 10,
            releaseTimeSeconds: 5,
            cycleTarget: 8,
          },
        ],
      }),
    ).rejects.toThrow('Compressor groups cannot be repeated');
  });
});
