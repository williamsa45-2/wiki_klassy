#!/usr/bin/env bash
# Construye y levanta la wiki. Sirve para HTTP y para HTTPS:
#   - DOMINIO vacío en .env  -> HTTP en PUERTO_WEB (por IP).
#   - DOMINIO definido       -> HTTPS con Caddy y certificado automático.
# Uso (desde la raíz del repo): ./deploy/levantar.sh
set -euo pipefail

[ -f .env ] || { echo "Falta .env: cp .env.produccion.example .env y editarlo."; exit 1; }
grep -qE '^JWT_SECRET=.{32,}' .env || { echo "JWT_SECRET en .env debe tener al menos 32 caracteres (openssl rand -hex 32)."; exit 1; }

archivos=(-f docker-compose.yml)
if grep -qE '^DOMINIO=.+' .env; then
  archivos+=(-f docker-compose.https.yml)
  echo "Modo HTTPS ($(grep -E '^DOMINIO=' .env | cut -d= -f2))"
else
  echo "Modo HTTP (sin DOMINIO): las contraseñas viajan sin cifrar, úsalo solo para probar."
fi

docker compose "${archivos[@]}" up -d --build
docker compose "${archivos[@]}" ps
