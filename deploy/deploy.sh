#!/bin/bash
set -euo pipefail

# ============================================
# CyberClass — Deploy full-stack a la VM de GCP
# Frontend: /var/www/cyberclass (nginx)
# Backend:  /opt/cyberclass-api (systemd, puerto 3001)
# https://cyberclass.calatam.com
# ============================================
#
# Requisitos: gcloud autenticado (usa túnel IAP, funciona aunque
# la IP esté baneada por fail2ban).
#
# Uso:  ./deploy/deploy.sh

ZONE="southamerica-west1-a"
VM="geocompliance-web"
DOMAIN="cyberclass.calatam.com"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GSSH() { gcloud compute ssh "$VM" --zone="$ZONE" --tunnel-through-iap --command="$1"; }

echo "==> [1/6] Build frontend"
cd "$ROOT/web" && npm ci --silent && npm run build

echo "==> [2/6] Build backend"
cd "$ROOT/api" && npm ci --silent && npm run build

echo "==> [3/6] Empaquetar y subir (tarball por SSH, robusto en IAP)"
cd "$ROOT"
tar czf /tmp/cyberclass-web.tgz -C web/dist .
tar czf /tmp/cyberclass-api.tgz -C api dist package.json package-lock.json
cat /tmp/cyberclass-web.tgz | GSSH "cat > /tmp/cyberclass-web.tgz"
cat /tmp/cyberclass-api.tgz | GSSH "cat > /tmp/cyberclass-api.tgz"

echo "==> [4/6] Instalar backend (Node + npm ci + systemd)"
GSSH "
set -e
# Node 24 LTS si no existe
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash - >/dev/null
  sudo apt-get install -y nodejs >/dev/null
fi
sudo mkdir -p /opt/cyberclass-api /var/lib/cyberclass
sudo tar xzf /tmp/cyberclass-api.tgz -C /opt/cyberclass-api
cd /opt/cyberclass-api && sudo npm ci --omit=dev --silent
sudo chown -R www-data:www-data /var/lib/cyberclass
# Env file con JWT_SECRET (solo la primera vez)
if [ ! -f /etc/cyberclass-api.env ]; then
  echo \"JWT_SECRET=\$(openssl rand -hex 32)
DB_PATH=/var/lib/cyberclass/app.db
PORT=3001\" | sudo tee /etc/cyberclass-api.env >/dev/null
  sudo chmod 600 /etc/cyberclass-api.env
fi
# Unidad systemd
sudo tee /etc/systemd/system/cyberclass-api.service >/dev/null <<'UNIT'
[Unit]
Description=CyberClass API (Fastify + SQLite)
After=network.target

[Service]
Type=simple
User=www-data
EnvironmentFile=/etc/cyberclass-api.env
WorkingDirectory=/opt/cyberclass-api
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/lib/cyberclass
ProtectHome=true

[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl daemon-reload
sudo systemctl enable cyberclass-api >/dev/null 2>&1
sudo systemctl restart cyberclass-api
sleep 1 && sudo systemctl is-active cyberclass-api
"

echo "==> [5/6] Frontend + nginx"
GSSH "
set -e
# Swap atómico: extraer a un dir nuevo y recién ahí reemplazar el vivo.
# NUNCA borrar el dir vivo antes de tener los archivos nuevos (si el tar
# está truncado por un timeout de red, el sitio quedaría en 403).
sudo rm -rf /var/www/cyberclass.new
sudo mkdir -p /var/www/cyberclass.new
sudo tar xzf /tmp/cyberclass-web.tgz -C /var/www/cyberclass.new
test -f /var/www/cyberclass.new/index.html
sudo chown -R www-data:www-data /var/www/cyberclass.new
sudo rm -rf /var/www/cyberclass.old
sudo mv /var/www/cyberclass /var/www/cyberclass.old 2>/dev/null || true
sudo mv /var/www/cyberclass.new /var/www/cyberclass
sudo rm -rf /var/www/cyberclass.old
# Agregar proxy /api si no existe (idempotente)
if ! grep -q 'location /api/' /etc/nginx/sites-available/cyberclass; then
  sudo sed -i 's|root /var/www/cyberclass;|root /var/www/cyberclass;\n    location /api/ { proxy_pass http://127.0.0.1:3001; proxy_http_version 1.1; proxy_set_header Host \$host; proxy_set_header X-Real-IP \$remote_addr; proxy_set_header X-Forwarded-Proto \$scheme; }|' /etc/nginx/sites-available/cyberclass
fi
sudo nginx -t && sudo systemctl reload nginx
rm -f /tmp/cyberclass-web.tgz /tmp/cyberclass-api.tgz
"

echo "==> [6/6] Verificación"
sleep 2
curl -s -o /dev/null -w "  Frontend: HTTP %{http_code}\n" "https://$DOMAIN/"
curl -s "https://$DOMAIN/api/health" && echo "  API: OK"

echo ""
echo "✅ Deploy completo: https://$DOMAIN"
