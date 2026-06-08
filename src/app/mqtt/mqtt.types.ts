export type DeviceTelemetry = {
  timestamp: string | number;
  state: string;
  pressureKpa: number;
  targetPressureKpa: number;
  filmRaw: number;
  filmBaseline: number;
  filmDelta: number;
  forceNewtons: number;
  temperatureC: number | null;
  cycleIndex?: number;
  pumpOn?: boolean;
  valveClosed?: boolean;
  holdRemainingMs?: number;
  configuredHoldTimeMs?: number;
  configuredReleaseTimeMs?: number;
  configuredCycleTarget?: number;
  error?: string;
};

export type DeviceAck = {
  timestamp?: string | number;
  command?: string;
  result?: string;
  durationMs?: number;
};

export type DeviceStatus = {
  connected: boolean;
  state: string;
  pressureKpa: number;
  targetPressureKpa: number;
  forceNewtons: number;
  temperatureC: number | null;
  cycleIndex?: number;
  pumpOn?: boolean;
  valveClosed?: boolean;
  holdRemainingMs?: number;
  updatedAt: string;
  error?: string;
  configuredHoldTimeMs?: number;
  configuredReleaseTimeMs?: number;
  configuredCycleTarget?: number;
  lastAck?: DeviceAck | null;
};
