# Despliegue en un VPS

Todo corre en contenedores: **mongo** (base, sin puertos públicos), **backend** (API), **frontend** (nginx: sirve la app y
reenvía `/api`) y, con dominio, **caddy** (HTTPS automático con Let's Encrypt).

## Requisitos

- VPS con Ubuntu 22.04/24.04 (1 vCPU y 1–2 GB de RAM alcanzan), Docker y Docker Compose ≥ 2.24.
- Un dominio con registro DNS **A** apuntando a la IP del VPS (recomendado: sin HTTPS las contraseñas viajan en claro).
- Puertos 80 y 443 abiertos.

## 1. Preparar el servidor (una vez)

```bash
curl -fsSL https://get.docker.com | sh
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
```

## 2. Subir el proyecto

Con git (recomendado): sube `wiki_klassy` a un repositorio **privado** y en el VPS:

```bash
git clone <tu-repo-privado> wiki_klassy && cd wiki_klassy
```

Sin git: `scp -r` de la carpeta (sin `node_modules`, `dist` ni `uploads`).

## 3. Configurar

```bash
cp .env.produccion.example .env
nano .env
```

Mínimo: `DOMINIO=wiki.tuempresa.com`, `PUBLIC_URL=https://wiki.tuempresa.com` y `JWT_SECRET` (genéralo con `openssl rand -hex 32`).
Opcional: `ANTHROPIC_API_KEY` para que el asistente use Claude (sin ella usa la búsqueda local).

## 4. Levantar

```bash
chmod +x deploy/*.sh
./deploy/levantar.sh
```

Construye las imágenes y arranca todo. La primera vez Caddy tarda ~1 minuto en obtener el certificado.

## 5. Crear el primer administrador

```bash
docker compose run --rm herramientas npm run crear-admin -- tucorreo@dominio.com "Tu Nombre" "una-contraseña-de-10+"
```

Entra en `https://tu-dominio`, ve a **Gestionar contenido**, crea secciones y sube documentos. Las personas piden acceso desde
«Solicitar acceso» y las apruebas en **Usuarios y permisos**.

## Despliegue automático (GitHub Actions)

Cada push a `main` ejecuta `.github/workflows/deploy.yml`: verifica tipos, pruebas y build, y si todo pasa entra al VPS por SSH y
corre `./deploy/actualizar.sh` (`git pull` + reconstruir contenedores + esperar a que el backend esté sano). Si algo falla, el
workflow queda en rojo y el servidor sigue con la versión anterior (si falla la verificación) o con el aviso en los logs.

Configuración, una sola vez:

1. **En el VPS**, crea una llave solo para desplegar y úsala de dos formas:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/deploy_github -N "" -C "deploy github actions"
   cat ~/.ssh/deploy_github.pub >> ~/.ssh/authorized_keys     # GitHub entra al VPS con esta llave
   ```
   Para que el VPS pueda hacer `git pull` de un repo privado, añade **otra** llave de solo lectura como *Deploy key* en
   GitHub (Settings → Deploy keys) y clona el repo por SSH (`git@github.com:usuario/wiki_klassy.git`).
2. **En GitHub** → Settings → Secrets and variables → Actions → *New repository secret*:

   | Secreto | Valor |
   | --- | --- |
   | `VPS_HOST` | IP o dominio del VPS |
   | `VPS_USER` | usuario SSH (con permiso para usar `docker`) |
   | `VPS_PATH` | ruta del clon, ej. `/home/ubuntu/wiki_klassy` |
   | `VPS_SSH_KEY` | contenido de `~/.ssh/deploy_github` (la **privada**) |
   | `VPS_KNOWN_HOSTS` | salida de `ssh-keyscan -t ed25519 IP_DEL_VPS` ejecutado desde tu PC |

3. Haz push a `main`. También puedes lanzarlo a mano desde la pestaña *Actions* → *Run workflow*.

El `.env` del VPS no está en git: no se toca en los despliegues. Si cambias variables, edítalo en el servidor y corre `./deploy/levantar.sh`.

## Operación

| Tarea | Comando |
| --- | --- |
| Actualizar a la última versión | `./deploy/actualizar.sh` |
| Ver logs | `docker compose logs -f backend` |
| Estado | `docker compose ps` |
| Respaldo (base + documentos) | `./deploy/respaldar.sh` |
| Respaldo diario (cron) | `0 3 * * * cd /ruta/wiki_klassy && ./deploy/respaldar.sh >> respaldos/cron.log 2>&1` |
| Reiniciar | `docker compose restart` |

**Respalda y copia los archivos de `respaldos/` fuera del VPS** (otro servidor, S3, tu PC): si el servidor se pierde, se pierde todo.

### Restaurar un respaldo

```bash
docker compose exec -T mongo mongorestore --archive --gzip --drop < respaldos/mongo-FECHA.archive.gz
docker compose exec -T backend tar -C /app -xzf - < respaldos/uploads-FECHA.tar.gz
```

## Notas de seguridad

- Mongo no está publicado: solo el backend lo alcanza por la red interna de Docker.
- Los documentos están en el volumen `uploads` y **nunca** se sirven como archivos estáticos: solo por la API con sesión y permiso.
- Cambiar `JWT_SECRET` cierra todas las sesiones abiertas.
- Con `DOMINIO` vacío el sitio queda en HTTP: úsalo solo para una prueba rápida.
- Si cambias `MAX_ARCHIVO_MB` por encima de 50, sube también `client_max_body_size` en `frontend/nginx.conf` y vuelve a levantar.
