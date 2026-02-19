import ping from 'ping';

export interface DeviceConfig {
  name: string;
  host: string;
}

export interface DeviceStatus {
  name: string;
  host: string;
  status: 'up' | 'down';
  latency?: number;
}

export async function pingDevice(device: DeviceConfig): Promise<DeviceStatus> {
  try {
    const result = await ping.promise.probe(device.host, {
      timeout: 3,
      min_reply: 1,
    });

    return {
      name: device.name,
      host: device.host,
      status: result.alive ? 'up' : 'down',
      latency: result.alive && typeof result.time === 'number' ? Math.round(result.time) : undefined,
    };
  } catch {
    return {
      name: device.name,
      host: device.host,
      status: 'down',
    };
  }
}

export async function pingAllDevices(devices: DeviceConfig[]): Promise<DeviceStatus[]> {
  const results = await Promise.all(devices.map(pingDevice));
  return results;
}
