import express from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
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

app.get('/api/stream', (req, res) => {
  const url = req.query.url;
  if (typeof url !== 'string' || !url.trim()) {
    res.status(400).json({ error: 'Missing or invalid url query' });
    return;
  }
  const streamUrl = url.trim();
  // Browser <img> expects multipart MJPEG; ffmpeg mpjpeg muxer uses boundary "ffserver"
  res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=ffserver');
  res.setHeader('Cache-Control', 'no-store');
  const ffmpeg = spawn('ffmpeg', [
    '-rtsp_transport', 'tcp',
    '-stimeout', '5000000',  // 5s RTSP timeout (microseconds)
    '-i', streamUrl,
    '-f', 'mpjpeg',
    '-q:v', '5',
    '-r', '5',
    '-an',
    'pipe:1',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  ffmpeg.stderr.on('data', (chunk: Buffer) => {
    console.error('[ffmpeg stream]', chunk.toString().trim());
  });
  ffmpeg.stdout.pipe(res);
  req.on('close', () => {
    ffmpeg.kill('SIGKILL');
  });
  ffmpeg.on('error', (err) => {
    console.error('FFmpeg stream error:', err);
    if (!res.headersSent) res.status(503).json({ error: 'Stream unavailable (ffmpeg required)' });
    else res.destroy();
  });
  ffmpeg.on('exit', (code, signal) => {
    if (code !== 0 && code !== null && !res.writableEnded) {
      console.error('[ffmpeg stream] exit', { code, signal });
    }
  });
});

app.listen(PORT, () => {
  console.log(`ShowMonitor API running at http://localhost:${PORT}`);
});
