# ShowMonitor

A lightweight ping monitoring dashboard with a modern dark mode UI. Monitors devices from a config file and displays their status in a card layout.

## Quick Start

```bash
npm install
npm run dev
```

This starts both the React frontend (http://localhost:5173) and the API server (http://localhost:3001). The frontend proxies `/api` requests to the backend.

## Configuration

Edit `devices.json` to add or remove devices to monitor:

```json
{
  "devices": [
    { "name": "Router", "host": "192.168.1.1" },
    { "name": "NAS", "host": "192.168.1.10" }
  ]
}
```

- **name**: Display name shown on the card
- **host**: IP address or hostname to ping

## Scripts

- `npm run dev` - Start frontend + backend together
- `npm run dev:client` - Start Vite frontend only
- `npm run dev:server` - Start API server only
- `npm run build` - Build frontend for production
- `npm run preview` - Preview production build

## Production

1. Build the frontend: `npm run build`
2. Serve the `dist/` folder with any static file server
3. Run the API server: `npm run dev:server` (or use tsx/node in production)
4. Configure your reverse proxy to route `/api` to the backend

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn-style components, Lucide icons
- **Backend**: Express, ping (ICMP via system ping)
