#!/usr/bin/env bash
#
# ShowMonitor Ubuntu server install script
# Run on a fresh Ubuntu server: sudo ./install.sh [options]
#
set -euo pipefail

# --- Config (override with env or pass args) ---
INSTALL_DIR="${INSTALL_DIR:-/opt/ShowMonitor}"
REPO_URL="${REPO_URL:-https://github.com/sk12dev/ShowMonitor.git}"
SERVER_NAME="${SERVER_NAME:-_}"
SERVICE_USER="${SERVICE_USER:-www-data}"
SKIP_NGINX="${SKIP_NGINX:-}"
NODE_VERSION="${NODE_VERSION:-22}"

# --- Help ---
usage() {
  cat <<EOF
Usage: sudo $0 [OPTIONS]

Options (or set as env vars):
  -d DIR       Install directory (default: $INSTALL_DIR)
  -r URL       Git repo URL (default: $REPO_URL)
  -s NAME      Nginx server_name (default: $SERVER_NAME, use _ for any)
  -u USER      User to run service (default: $SERVICE_USER)
  -n           Skip nginx install and config
  -h           Show this help

Example:
  sudo INSTALL_DIR=/opt/ShowMonitor REPO_URL=https://github.com/me/ShowMonitor.git ./install.sh
EOF
  exit 0
}

while getopts "d:r:s:u:n h" opt; do
  case "$opt" in
    d) INSTALL_DIR="$OPTARG" ;;
    r) REPO_URL="$OPTARG" ;;
    s) SERVER_NAME="$OPTARG" ;;
    u) SERVICE_USER="$OPTARG" ;;
    n) SKIP_NGINX=1 ;;
    h) usage ;;
    *) usage ;;
  esac
done

if [[ $EUID -ne 0 ]]; then
  echo "Run this script as root (e.g. sudo $0)" >&2
  exit 1
fi

echo "=== ShowMonitor install ==="
echo "  Install dir: $INSTALL_DIR"
echo "  Repo:        $REPO_URL"
echo "  Nginx name:  $SERVER_NAME"
echo "  Service user: $SERVICE_USER"
echo ""

# --- 1. Prerequisites ---
echo "[1/8] Updating apt and installing prerequisites..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git

if ! command -v node &>/dev/null || ! node -e "exit(process.versions.node.split('.')[0] >= 18 ? 0 : 1)"; then
  echo "[2/8] Installing Node.js $NODE_VERSION.x (NodeSource)..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  apt-get install -y -qq nodejs
else
  echo "[2/8] Node.js already present: $(node -v)"
fi

NODE_PATH=$(which node)
echo "     Node: $NODE_PATH"

# --- 3. Clone and npm install ---
PARENT_DIR=$(dirname "$INSTALL_DIR")
REPO_NAME=$(basename "$INSTALL_DIR")

echo "[3/8] Cloning repo to $INSTALL_DIR..."
if [[ -d "$INSTALL_DIR/.git" ]]; then
  echo "     Directory already exists; pulling latest..."
  (cd "$INSTALL_DIR" && git pull -q)
else
  mkdir -p "$PARENT_DIR"
  git clone -q "$REPO_URL" "$INSTALL_DIR"
fi

echo "[4/8] Installing npm dependencies..."
(cd "$INSTALL_DIR" && npm install)

# --- devices.json ---
DEVICES_JSON="$INSTALL_DIR/devices.json"
if [[ ! -s "$DEVICES_JSON" ]]; then
  echo "[5/8] Creating sample devices.json (edit with your hosts)..."
  cat > "$DEVICES_JSON" <<'DEVICES'
{
  "devices": [
    { "name": "Router", "host": "192.168.1.1" },
    { "name": "Example", "host": "10.0.0.1" }
  ]
}
DEVICES
else
  echo "[5/8] Using existing devices.json"
fi

# --- Build ---
echo "[6/8] Building frontend..."
(cd "$INSTALL_DIR" && npm run build)

# --- Nginx ---
if [[ -z "${SKIP_NGINX:-}" ]]; then
  echo "[7/8] Installing and configuring nginx..."
  apt-get install -y -qq nginx
  NGINX_SITE="/etc/nginx/sites-available/showmonitor"
  cat > "$NGINX_SITE" <<NGINX
server {
    listen 80;
    server_name $SERVER_NAME;
    root $INSTALL_DIR/dist;
    index index.html;
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
NGINX
  ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/showmonitor
  nginx -t && systemctl reload nginx
else
  echo "[7/8] Skipping nginx (SKIP_NGINX=1)"
fi

# --- systemd service ---
echo "[8/8] Installing systemd service..."
TSX_BIN="$INSTALL_DIR/node_modules/.bin/tsx"
if [[ ! -x "$TSX_BIN" ]]; then
  (cd "$INSTALL_DIR" && npm install tsx --save-dev)
fi
TSX_BIN="$INSTALL_DIR/node_modules/.bin/tsx"

cat > /etc/systemd/system/showmonitor.service <<SVC
[Unit]
Description=ShowMonitor API
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$TSX_BIN server/index.ts
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SVC

# Ownership: service user must read app and run tsx
if ! getent group "$SERVICE_USER" &>/dev/null; then
  echo "     Creating user/group $SERVICE_USER..."
  adduser --system --no-create-home --group "$SERVICE_USER" 2>/dev/null || true
fi
chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"

# ICMP: allow ping without root
if getcap "$NODE_PATH" 2>/dev/null | grep -q cap_net_raw; then
  echo "     Node already has cap_net_raw"
else
  echo "     Adding cap_net_raw to node for ICMP ping..."
  setcap cap_net_raw+ep "$NODE_PATH"
fi

systemctl daemon-reload
systemctl enable showmonitor
systemctl restart showmonitor

echo ""
echo "=== Done ==="
echo "  App:     $INSTALL_DIR"
echo "  Frontend: http://$(hostname -I | awk '{print $1}')/ (or your server name)"
echo "  API:     http://127.0.0.1:3001/api/status"
echo "  Service: systemctl status showmonitor"
echo ""
echo "Edit devices: $DEVICES_JSON"
echo "Then: sudo systemctl restart showmonitor (if you change devices.json)"
echo ""
