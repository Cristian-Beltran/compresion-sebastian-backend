import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { randomUUID } from 'crypto';
import mqtt, { MqttClient } from 'mqtt';
import config from 'src/context/shared/config';
import { AlertsService } from '../alerts/alerts.service';
import { LogsService } from '../logs/logs.service';
import { DeviceAck, DeviceStatus, DeviceTelemetry } from './mqtt.types';

type CommandContext = {
  actorUserId?: string;
  category?: string;
  groupId?: number;
  treatmentId?: string;
};

type PendingCommand = {
  command: string;
  resolve: (ack: DeviceAck) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient;
  private lastTelemetry: DeviceTelemetry | null = null;
  private telemetryBuffer: DeviceTelemetry[] = [];
  private readonly pendingCommands = new Map<string, PendingCommand>();
  private lastDeviceOnline = false;
  private lastTelemetryReceivedAt = 0;
  private lastTelemetrySummaryAt = 0;
  private healthTimer?: NodeJS.Timeout;
  private status: DeviceStatus = {
    connected: false,
    online: false,
    brokerConnected: false,
    state: 'OFFLINE',
    pressureKpa: 0,
    targetPressureKpa: 0,
    forceNewtons: 0,
    temperatureC: null,
    cycleIndex: 0,
    pumpOn: false,
    valveClosed: false,
    holdRemainingMs: 0,
    configuredHoldTimeMs: 0,
    configuredReleaseTimeMs: 0,
    configuredCycleTarget: 0,
    maintenanceMode: false,
    updatedAt: new Date().toISOString(),
    lastAck: null,
  };

  constructor(
    @Inject(config.KEY)
    private readonly appConfig: ConfigType<typeof config>,
    private readonly logsService: LogsService,
    private readonly alertsService: AlertsService,
  ) {}

  onModuleInit() {
    const { url, user, password, topicRoot, deviceId } = this.appConfig.mqtt;
    const telemetryTopic = `${topicRoot}/device/+/telemetry`;
    const statusTopic = `${topicRoot}/device/${deviceId}/status`;
    const alertsTopic = `${topicRoot}/device/${deviceId}/alerts`;
    const ackTopic = `${topicRoot}/device/${deviceId}/cmd/ack`;

    const connectOptions: Record<string, unknown> = {
      reconnectPeriod: 2000,
      clientId: `backend-${Math.random().toString(16).slice(2, 10)}`,
    };
    if (user) {
      connectOptions.username = user;
      connectOptions.password = password;
    }

    this.client = mqtt.connect(url, connectOptions);

    this.client.on('connect', () => {
      this.logger.log(`MQTT connected to ${url}`);
      this.client.subscribe(
        [telemetryTopic, statusTopic, alertsTopic, ackTopic],
        (error) => {
          if (error)
            this.logger.error(`MQTT subscribe error: ${error.message}`);
        },
      );
      this.status.brokerConnected = true;
      this.status.updatedAt = new Date().toISOString();
      void this.logsService.create({
        level: 'info',
        source: 'mqtt',
        category: 'connection',
        eventType: 'broker_connected',
        deviceId,
        message: 'Backend conectado al broker MQTT',
      });
    });

    this.client.on('close', () => {
      const wasConnected = this.status.brokerConnected;
      this.markDeviceOnline(false, 'broker_closed');
      this.status.brokerConnected = false;
      this.status.updatedAt = new Date().toISOString();
      if (wasConnected) {
        void this.logsService.create({
          level: 'warn',
          source: 'mqtt',
          category: 'connection',
          eventType: 'broker_disconnected',
          deviceId,
          message: 'Se perdió la conexión con el broker MQTT',
        });
      }
      this.rejectPendingCommands('Conexión MQTT cerrada');
    });

    this.client.on('message', (topic, payloadBuffer) => {
      const payloadText = payloadBuffer.toString();
      try {
        const payload = JSON.parse(payloadText) as Record<string, unknown>;
        if (topic.endsWith('/telemetry')) this.handleTelemetry(payload);
        else if (topic === statusTopic) this.handleStatus(payload);
        else if (topic === alertsTopic) this.handleAlert(payload, payloadText);
        else if (topic === ackTopic) this.handleAck(payload as DeviceAck);
      } catch (error) {
        this.logger.warn(`Invalid MQTT JSON on ${topic}: ${payloadText}`);
        void this.logsService.create({
          level: 'warn',
          source: 'mqtt',
          category: 'telemetry',
          eventType: 'invalid_payload',
          deviceId,
          message: 'Se recibió un mensaje MQTT inválido',
          metadata: {
            topic,
            payload: payloadText.slice(0, 500),
            error: error instanceof Error ? error.message : 'invalid_json',
          },
        });
      }
    });

    this.healthTimer = setInterval(() => this.checkDeviceSilence(), 5000);
    this.healthTimer.unref();
  }

  onModuleDestroy() {
    if (this.healthTimer) clearInterval(this.healthTimer);
    this.rejectPendingCommands('Backend detenido');
    this.client?.end(true);
  }

  private handleTelemetry(payload: Record<string, unknown>) {
    const telemetry = payload as DeviceTelemetry;
    const now = new Date().toISOString();
    const groups = Array.isArray(telemetry.groups)
      ? telemetry.groups
      : (this.status.groups ?? []);
    const primaryGroup = groups.find((group) => group.enabled) ?? groups[0];

    this.lastTelemetry = telemetry;
    this.telemetryBuffer.push(telemetry);
    if (this.telemetryBuffer.length > 300) this.telemetryBuffer.shift();
    this.lastTelemetryReceivedAt = Date.now();
    this.markDeviceOnline(true, 'telemetry');

    this.status = {
      ...this.status,
      connected: true,
      online: true,
      brokerConnected: true,
      state: telemetry.state ?? 'UNKNOWN',
      pressureKpa: Number(primaryGroup?.pressureKpa ?? 0),
      targetPressureKpa: Number(primaryGroup?.targetPressureKpa ?? 0),
      forceNewtons: Number(primaryGroup?.forceNewtons ?? 0),
      temperatureC:
        telemetry.temperatureC === null || telemetry.temperatureC === undefined
          ? null
          : Number(telemetry.temperatureC),
      temperature1C:
        telemetry.temperature1C == null
          ? null
          : Number(telemetry.temperature1C),
      temperature2C:
        telemetry.temperature2C == null
          ? null
          : Number(telemetry.temperature2C),
      fanPowerPercent: Number(telemetry.fanPowerPercent ?? 0),
      wifiRssi: Number(telemetry.wifiRssi ?? 0),
      maintenanceMode: Boolean(telemetry.maintenanceMode),
      calibrationVersion: Number(telemetry.calibrationVersion ?? 0),
      cycleIndex: Number(primaryGroup?.cycleIndex ?? 0),
      pumpOn: Boolean(primaryGroup?.pumpOn),
      valveClosed: Boolean(primaryGroup?.valveClosed),
      holdRemainingMs: Number(primaryGroup?.holdRemainingMs ?? 0),
      configuredHoldTimeMs: Number(primaryGroup?.holdTimeMs ?? 0),
      configuredReleaseTimeMs: Number(primaryGroup?.releaseTimeMs ?? 0),
      configuredCycleTarget: Number(primaryGroup?.cycleTarget ?? 0),
      activeMask: Number(telemetry.activeMask ?? this.status.activeMask ?? 0),
      treatmentRunning:
        telemetry.state !== 'MENU' &&
        telemetry.state !== 'LISTO' &&
        telemetry.state !== 'MANTENIMIENTO',
      treatmentId: telemetry.treatmentId ?? this.status.treatmentId,
      groups,
      error: telemetry.error,
      updatedAt: now,
      lastSeenAt: now,
    };

    if (Date.now() - this.lastTelemetrySummaryAt >= 60_000) {
      this.lastTelemetrySummaryAt = Date.now();
      void this.logsService.create({
        level: 'info',
        source: 'telemetry',
        category: 'telemetry',
        eventType: 'telemetry_summary',
        deviceId: this.appConfig.mqtt.deviceId,
        treatmentId: telemetry.treatmentId,
        message: `Telemetría recibida: ${groups.length} grupos, estado ${telemetry.state}`,
        metadata: {
          state: telemetry.state,
          groups: groups.map((group) => ({
            groupId: group.groupId,
            pressureKpa: group.pressureKpa,
            forceNewtons: group.forceNewtons,
            sensorAvailable: group.pressureSensorAvailable,
          })),
          temperatureC: telemetry.temperatureC,
          wifiRssi: telemetry.wifiRssi,
        },
      });
    }
  }

  private handleStatus(payload: Record<string, unknown>) {
    const online = Boolean(payload.online ?? payload.connected ?? false);
    const now = new Date().toISOString();
    if (online) this.lastTelemetryReceivedAt = Date.now();
    this.markDeviceOnline(online, 'status');
    this.status = {
      ...this.status,
      connected: online,
      online,
      brokerConnected: true,
      state: online ? String(payload.state ?? this.status.state) : 'OFFLINE',
      activeMask: Number(payload.activeMask ?? this.status.activeMask ?? 0),
      treatmentRunning: Boolean(payload.treatmentRunning),
      maintenanceMode: Boolean(payload.maintenanceMode),
      calibrationVersion: Number(
        payload.calibrationVersion ?? this.status.calibrationVersion ?? 0,
      ),
      treatmentId: String(payload.treatmentId ?? this.status.treatmentId ?? ''),
      updatedAt: now,
      lastSeenAt: online ? now : this.status.lastSeenAt,
    };
  }

  private handleAlert(payload: Record<string, unknown>, payloadText: string) {
    this.logger.warn(`MQTT alert: ${payloadText}`);
    const severity = ['info', 'warn', 'critical'].includes(
      String(payload.severity),
    )
      ? (String(payload.severity) as 'info' | 'warn' | 'critical')
      : 'warn';
    void this.alertsService.create({
      severity,
      message: String(payload.message ?? payloadText),
      metadata: payload,
    });
    void this.logsService.create({
      level: 'warn',
      source: 'device',
      category: 'alert',
      eventType: 'device_alert',
      deviceId: this.appConfig.mqtt.deviceId,
      groupId: payload.groupId ? Number(payload.groupId) : undefined,
      message: String(payload.message ?? 'Alerta recibida del dispositivo'),
      metadata: payload,
    });
  }

  private handleAck(ack: DeviceAck) {
    this.status = {
      ...this.status,
      lastAck: ack,
      updatedAt: new Date().toISOString(),
    };
    const accepted = ['accepted', 'completed', 'ok'].includes(
      String(ack.result ?? '').toLowerCase(),
    );
    void this.logsService.create({
      level: accepted ? 'info' : 'warn',
      source: 'ack',
      category: ack.sensorType ? 'calibration' : 'command',
      eventType: accepted ? 'command_confirmed' : 'command_rejected',
      deviceId: this.appConfig.mqtt.deviceId,
      groupId: ack.groupId,
      treatmentId: ack.treatmentId,
      requestId: ack.requestId,
      message: `ESP respondió ${ack.result ?? 'sin resultado'} a ${ack.command ?? 'comando'}`,
      metadata: ack,
    });

    if (ack.command === 'START_TREATMENT' && ack.result === 'completed') {
      void this.logsService.create({
        level: 'info',
        source: 'treatment',
        category: 'session',
        eventType: 'session_completed',
        treatmentId: ack.treatmentId,
        deviceId: this.appConfig.mqtt.deviceId,
        message: 'Sesión completada por el dispositivo',
        metadata: ack,
      });
    }

    if (!ack.requestId) return;
    const pending = this.pendingCommands.get(ack.requestId);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pendingCommands.delete(ack.requestId);
    pending.resolve(ack);
  }

  private markDeviceOnline(online: boolean, reason: string) {
    if (this.lastDeviceOnline === online) return;
    this.lastDeviceOnline = online;
    this.status.connected = online;
    this.status.online = online;
    if (!online) this.status.state = 'OFFLINE';
    void this.logsService.create({
      level: online ? 'info' : 'warn',
      source: 'device',
      category: 'connection',
      eventType: online ? 'device_online' : 'device_offline',
      deviceId: this.appConfig.mqtt.deviceId,
      message: online
        ? 'ESP32 conectado y enviando datos'
        : 'ESP32 sin conexión',
      metadata: { reason },
    });
  }

  private checkDeviceSilence() {
    if (
      this.lastDeviceOnline &&
      this.lastTelemetryReceivedAt > 0 &&
      Date.now() - this.lastTelemetryReceivedAt > 10_000
    ) {
      this.markDeviceOnline(false, 'telemetry_timeout');
    }
  }

  private rejectPendingCommands(message: string) {
    for (const pending of this.pendingCommands.values()) {
      clearTimeout(pending.timer);
      pending.reject(new ServiceUnavailableException(message));
    }
    this.pendingCommands.clear();
  }

  getStatus() {
    return this.status;
  }

  getLastTelemetry() {
    return this.lastTelemetry;
  }

  getTelemetryHistory() {
    return this.telemetryBuffer;
  }

  publishCommand(
    command: string,
    payload: Record<string, unknown> = {},
    context: CommandContext = {},
  ) {
    if (!this.client?.connected) {
      throw new ServiceUnavailableException('Broker MQTT no disponible');
    }
    const { topicRoot, deviceId } = this.appConfig.mqtt;
    const topic = `${topicRoot}/device/${deviceId}/control`;
    const requestId =
      typeof payload.requestId === 'string' ? payload.requestId : randomUUID();
    const body = {
      command,
      timestamp: new Date().toISOString(),
      ...payload,
      requestId,
    };
    this.client.publish(topic, JSON.stringify(body), { qos: 1 });
    void this.logsService.create({
      level: 'info',
      source: 'command',
      category: context.category ?? 'command',
      eventType: 'command_published',
      deviceId,
      groupId: context.groupId,
      treatmentId: context.treatmentId,
      actorUserId: context.actorUserId,
      requestId,
      message: `Comando ${command} enviado al ESP32`,
      metadata: body,
    });
    return { topic, message: body, requestId };
  }

  publishCommandAndWait(
    command: string,
    payload: Record<string, unknown> = {},
    context: CommandContext = {},
    timeoutMs = 8000,
  ) {
    const requestId = randomUUID();
    const promise = new Promise<DeviceAck>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingCommands.delete(requestId);
        void this.logsService.create({
          level: 'error',
          source: 'command',
          category: context.category ?? 'command',
          eventType: 'command_timeout',
          deviceId: this.appConfig.mqtt.deviceId,
          groupId: context.groupId,
          treatmentId: context.treatmentId,
          actorUserId: context.actorUserId,
          requestId,
          message: `El ESP32 no confirmó ${command} dentro del tiempo esperado`,
        });
        reject(
          new ServiceUnavailableException('El ESP32 no respondió al comando'),
        );
      }, timeoutMs);
      this.pendingCommands.set(requestId, { command, resolve, reject, timer });
    });

    try {
      this.publishCommand(command, { ...payload, requestId }, context);
    } catch (error) {
      const pending = this.pendingCommands.get(requestId);
      if (pending) clearTimeout(pending.timer);
      this.pendingCommands.delete(requestId);
      throw error;
    }
    return promise;
  }
}
