import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import config from 'src/context/shared/config';
import mqtt, { MqttClient } from 'mqtt';
import { DeviceAck, DeviceStatus, DeviceTelemetry } from './mqtt.types';
import { LogsService } from '../logs/logs.service';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class MqttService implements OnModuleInit {
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient;
  private lastTelemetry: DeviceTelemetry | null = null;
  private telemetryBuffer: DeviceTelemetry[] = [];
  private status: DeviceStatus = {
    connected: false,
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
    const { url, topicRoot, deviceId } = this.appConfig.mqtt;
    const commandTopic = `${topicRoot}/device/${deviceId}/cmd`;
    const telemetryTopic = `${topicRoot}/device/${deviceId}/telemetry`;
    const statusTopic = `${topicRoot}/device/${deviceId}/status`;
    const alertsTopic = `${topicRoot}/device/${deviceId}/alerts`;
    const ackTopic = `${topicRoot}/device/${deviceId}/cmd/ack`;

    this.client = mqtt.connect(url, {
      reconnectPeriod: 2000,
      clientId: `backend-${Math.random().toString(16).slice(2, 10)}`,
    });

    this.client.on('connect', () => {
      this.logger.log(`MQTT connected to ${url}`);
      this.client.subscribe([telemetryTopic, statusTopic, alertsTopic, ackTopic], (err) => {
        if (err) this.logger.error(`MQTT subscribe error: ${err.message}`);
      });
      this.status.connected = true;
      this.status.updatedAt = new Date().toISOString();
      void this.logsService.create({
        level: 'info',
        source: 'mqtt',
        message: 'Connected to MQTT broker',
      });
    });

    this.client.on('close', () => {
      this.status.connected = false;
      this.status.updatedAt = new Date().toISOString();
      this.logger.warn('MQTT connection closed');
      void this.logsService.create({
        level: 'warn',
        source: 'mqtt',
        message: 'MQTT connection closed',
      });
    });

    this.client.on('message', (topic, payloadBuffer) => {
      const payloadText = payloadBuffer.toString();
      try {
        const payload = JSON.parse(payloadText);
        if (topic === telemetryTopic) {
          this.lastTelemetry = payload as DeviceTelemetry;
          this.telemetryBuffer.push(this.lastTelemetry);
          if (this.telemetryBuffer.length > 300) this.telemetryBuffer.shift();
          this.status = {
            connected: true,
            state: payload.state ?? 'UNKNOWN',
            pressureKpa: Number(payload.pressureKpa ?? 0),
            targetPressureKpa: Number(payload.targetPressureKpa ?? 0),
            forceNewtons: Number(payload.forceNewtons ?? 0),
            temperatureC:
              payload.temperatureC === null || payload.temperatureC === undefined
                ? null
                : Number(payload.temperatureC),
            cycleIndex:
              payload.cycleIndex === undefined ? 0 : Number(payload.cycleIndex),
            pumpOn: Boolean(payload.pumpOn),
            valveClosed: Boolean(payload.valveClosed),
            holdRemainingMs:
              payload.holdRemainingMs === undefined
                ? 0
                : Number(payload.holdRemainingMs),
            configuredHoldTimeMs:
              payload.configuredHoldTimeMs === undefined
                ? this.status.configuredHoldTimeMs ?? 0
                : Number(payload.configuredHoldTimeMs),
            configuredReleaseTimeMs:
              payload.configuredReleaseTimeMs === undefined
                ? this.status.configuredReleaseTimeMs ?? 0
                : Number(payload.configuredReleaseTimeMs),
            configuredCycleTarget:
              payload.configuredCycleTarget === undefined
                ? this.status.configuredCycleTarget ?? 0
                : Number(payload.configuredCycleTarget),
            updatedAt:
              payload.timestamp === undefined
                ? new Date().toISOString()
                : String(payload.timestamp),
            error: payload.error,
            lastAck: this.status.lastAck ?? null,
          };
        }

        if (topic === statusTopic) {
          this.status = {
            ...this.status,
            connected: true,
            state: payload.state ?? this.status.state,
            updatedAt:
              payload.timestamp === undefined
                ? new Date().toISOString()
                : String(payload.timestamp),
          };
        }

        if (topic === alertsTopic) {
          this.logger.warn(`MQTT alert: ${payloadText}`);
          void this.alertsService.create({
            severity: payload.severity ?? 'warn',
            message: payload.message ?? payloadText,
            metadata: payload,
          });
          void this.logsService.create({
            level: 'warn',
            source: 'mqtt',
            message: 'Alert received from device',
            metadata: payload,
          });
        }

        if (topic === ackTopic) {
          this.status = {
            ...this.status,
            lastAck: payload as DeviceAck,
            updatedAt: new Date().toISOString(),
          };
          void this.logsService.create({
            level: 'info',
            source: 'ack',
            message: `ACK ${payload.command ?? ''} ${payload.result ?? ''}`.trim(),
            metadata: payload,
          });
        }
      } catch {
        this.logger.warn(`Non-JSON MQTT message on ${topic}: ${payloadText}`);
      }
    });

    this.logger.log(`MQTT command topic ready: ${commandTopic}`);
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

  publishCommand(command: string, payload: Record<string, unknown> = {}) {
    const { topicRoot, deviceId } = this.appConfig.mqtt;
    const topic = `${topicRoot}/device/${deviceId}/cmd`;
    const message = JSON.stringify({
      command,
      timestamp: new Date().toISOString(),
      ...payload,
    });
    this.client.publish(topic, message);
    void this.logsService.create({
      level: 'info',
      source: 'command',
      message: `Command ${command} published`,
      metadata: payload,
    });
    return { topic, message: JSON.parse(message) };
  }
}
