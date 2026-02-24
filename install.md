# Installing ShowMonitor on Ubuntu Server

## 1. Prerequisites on Ubuntu

- **Node.js** (LTS, e.g. 20.x or 22.x). Two common options:
  - **NodeSource:**  
    `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -` then `sudo apt-get install -y nodejs`
  - **nvm** (user-level): install from https://github.com/nvm-sh/nvm then `nvm install --lts`
- **Git:**  
  `sudo apt-get install -y git`

## 2. Get the app and install dependencies

```bash
cd /opt   # or /var/www or wherever you prefer
sudo git clone https://github.com/YOUR_ORG/ShowMonitor.git
cd ShowMonitor
sudo npm install
```

(Use your actual repo URL if different.)

## 3. Configure devices

Edit `devices.json` in the project root with the hosts you want to monitor (see main README for format).

## 4. Build the frontend

```bash
npm run build
```

This creates the production frontend in `dist/`.

## 5. Run the API server in production

The server is TypeScript and only has a dev script (`tsx server/index.ts`). For production you can:

- **Option A – Use tsx:**  
  `npx tsx server/index.ts`  
  (or install tsx globally and run `tsx server/index.ts`).
- **Option B – Compile and run with Node:**  
  Add a build step that compiles `server/**/*.ts` to JavaScript (e.g. with `tsc`), then run `node server/index.js` (paths in code use `__dirname` so run from project root).

The API listens on **port 3001** and does **not** serve the `dist/` folder; it only exposes `/api/status`.

## 6. Serve the frontend and proxy `/api`

You need a reverse proxy so that:

- `/` → static files from `dist/`
- `/api` → backend on port 3001

**Example with nginx:**

- Install: `sudo apt-get install -y nginx`
- Create a site config (e.g. `/etc/nginx/sites-available/showmonitor`):

```nginx
server {
    listen 80;
    server_name your-server-name-or-ip;
    root /opt/ShowMonitor/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/showmonitor /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 7. Keep the API server running (systemd)

Create `/etc/systemd/system/showmonitor.service`:

```ini
[Unit]
Description=ShowMonitor API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/ShowMonitor
ExecStart=/usr/bin/npx tsx server/index.ts
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable showmonitor
sudo systemctl start showmonitor
```

Adjust `User` to match who should own the app files (e.g. `www-data` or a dedicated user). If you need to run as root for ICMP (see below), change `User=` accordingly.

## 8. ICMP ping on Linux

The app uses the `ping` npm package, which shells out to the system `ping` binary. On Linux, sending ICMP typically requires **CAP_NET_RAW** or root.

- If everything shows "down" even when devices are reachable, either:
  - Run the ShowMonitor process as root (e.g. `User=root` in the unit), or
  - Give the Node binary the capability:  
    `sudo setcap cap_net_raw+ep $(which node)`  
    (use the same `node` that runs your app, e.g. the one used by `npx tsx`).
- Prefer capabilities or a dedicated user over running the whole app as root if you can.

## Summary checklist

| Step | Action |
|------|--------|
| 1 | Install Node.js LTS and git on Ubuntu |
| 2 | Clone repo, `npm install`, edit `devices.json` |
| 3 | `npm run build` |
| 4 | Run API with `npx tsx server/index.ts` (or compiled JS) |
| 5 | Use nginx (or similar) to serve `dist/` and proxy `/api` to port 3001 |
| 6 | Use systemd (or pm2) to keep the API running and start on boot |
| 7 | If ping fails, fix ICMP (e.g. `setcap` or run as root) |

There's no Dockerfile or systemd unit in the repo yet; the above is a manual install. You could add a Dockerfile or a single systemd unit that runs both a static server and the API if you want an all-in-one deploy.
