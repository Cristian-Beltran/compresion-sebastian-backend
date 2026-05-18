export type DeviceTelemetry = {
  timestamp: string;
  state: string;
  pressureKpa: number;
  targetPressureKpa: number;
  filmRaw: number;
  filmBaseline: number;
  filmDelta: number;
  filmPercent: number;
  temperatureC: number | null;
  cycleIndex?: number;
  pumpOn?: boolean;
  valveClosed?: boolean;
  holdRemainingMs?: number;
  error?: string;
};

export type DeviceStatus = {
  connected: boolean;
  state: string;
  pressureKpa: number;
  targetPressureKpa: number;
  filmPercent: number;
  temperatureC: number | null;
  cycleIndex?: number;
  pumpOn?: boolean;
  valveClosed?: boolean;
  holdRemainingMs?: number;
  updatedAt: string;
  error?: string;
};
