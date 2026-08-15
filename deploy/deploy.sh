#!/bin/bash
set -euo pipefail

# ============================================
# CyberClass — Deploy a la VM de GCP
# Sirve https://cyberclass.calatam.com con nginx + Let's Encrypt
# ============================================
#
# Requisitos previos (una sola vez):
#   1. Registro DNS en GoDaddy:  A  cyberclass  ->  34.176.202.215
#   2. Acceso SSH a la VM con la llave google_compute_engine
#
# Uso:
#   ./deploy/deploy.sh            # build + subir + (primera vez) configurar nginx/SSL
#
# Variables:
VM_IP="${VM_IP:-34.176.202.215}"
VM_USER="${VM_USER:-juanpablolefian}"
KEY="${SSH_KEY:-$HOME/.ssh/google_compute_engine}"
DOMAIN="cyberclass.calatam.com"
WEB_DIR="$(cd "$(dirname "$0")/.." && pwd)/web"
SSH="ssh -i $KEY -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP}"
SCP="scp -i $KEY -o StrictHostKeyChecking=no"

echo "==> [1/5] Build del frontend"
cd "$WEB_DIR"
npm ci --silent
npm run build

echo "==> [2/5] Subir build a /tmp de la VM"
$SSH "rm -rf /tmp/cyberclass-deploy && mkdir -p /tmp/cyberclass-deploy"
$SCP -r dist/* "${VM_USER}@${VM_IP}:/tmp/cyberclass-deploy/"

echo "==> [3/5] Mover a /var/www/cyberclass"
$SSH "sudo mkdir -p /var/www/cyberclass && sudo rm -rf /var/www/cyberclass/* && sudo cp -r /tmp/cyberclass-deploy/* /var/www/cyberclass/ && sudo chown -R www-data:www-data /var/www/cyberclass && rm -rf /tmp/cyberclass-deploy"

echo "==> [4/5] Configurar nginx (idempotente)"
$SCP "$(dirname "$0")/nginx-cyberclass.conf" "${VM_USER}@${VM_IP}:/tmp/nginx-cyberclass.conf"
$SSH "sudo mv /tmp/nginx-cyberclass.conf /etc/nginx/sites-available/cyberclass && sudo ln -sf /etc/nginx/sites-available/cyberclass /etc/nginx/sites-enabled/cyberclass && sudo nginx -t && sudo systemctl reload nginx"

echo "==> [5/5] SSL con Let's Encrypt (si aún no existe)"
$SSH "sudo certbot certificates 2>/dev/null | grep -q $DOMAIN || sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m jplefian@gmail.com --redirect"

echo ""
echo "✅ Deploy completo: https://$DOMAIN"
