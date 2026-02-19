import express from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pingAllDevices } from './ping';
import type { DeviceConfig } from './ping.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3001;

const app = express();

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

function loadDevices(): DeviceConfig[] {
  const configPath = join(__dirname, '..', 'devices.json');
  const data = JSON.parse(readFileSync(configPath, 'utf-8'));
  return data.devices ?? [];
}

app.get('/api/status', async (_req, res) => {
  try {
    const devices = loadDevices();
    const statuses = await pingAllDevices(devices);
    res.json({ devices: statuses });
  } catch (err) {
    console.error('Error fetching status:', err);
    res.status(500).json({ error: 'Failed to fetch device status' });
  }
});

app.listen(PORT, () => {
  console.log(`ShowMonitor API running at http://localhost:${PORT}`);
});
