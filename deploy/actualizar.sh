#!/usr/bin/env bash
# Actualiza el VPS a la última versión de la rama actual y reconstruye los contenedores
# (HTTP o HTTPS según DOMINIO en .env). Lo ejecuta .github/workflows/deploy.yml en cada push a main.
set -euo pipefail

git pull --ff-only
./deploy/levantar.sh

# Si el backend no queda sano, el despliegue falla (y GitHub Actions lo marca en rojo).
echo "Esperando a que el backend quede sano..."
for _ in $(seq 1 30); do
  estado="$(docker inspect --format '{{.State.Health.Status}}' "$(docker compose ps -q backend)" 2>/dev/null || echo desconocido)"
  [ "$estado" = "healthy" ] && { echo "Backend sano."; docker image prune -f; exit 0; }
  sleep 2
done
echo "El backend no quedó sano. Revisa: docker compose logs --tail=100 backend" >&2
exit 1
