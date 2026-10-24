#!/usr/bin/env bash
# Respaldo de la base y de los documentos subidos (guárdalos fuera del VPS).
# Uso (desde la raíz del repo): ./deploy/respaldar.sh [directorio]   (por defecto ./respaldos)
# Cron diario sugerido:  0 3 * * * cd /ruta/wiki_klassy && ./deploy/respaldar.sh >> respaldos/cron.log 2>&1
set -euo pipefail

destino="${1:-respaldos}"
fecha="$(date +%F_%H%M)"
base="$(grep -E '^MONGO_DB=' .env 2>/dev/null | cut -d= -f2 || true)"
base="${base:-wiki_klassy}"
mkdir -p "$destino"

docker compose exec -T mongo mongodump --archive --gzip --db "$base" > "$destino/mongo-$fecha.archive.gz"
docker compose exec -T backend tar -C /app -czf - uploads > "$destino/uploads-$fecha.tar.gz"

# Conserva los últimos 14 respaldos de cada tipo.
ls -1t "$destino"/mongo-*.archive.gz 2>/dev/null | tail -n +15 | xargs -r rm --
ls -1t "$destino"/uploads-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm --
echo "Respaldo listo: $destino/*-$fecha.*"
