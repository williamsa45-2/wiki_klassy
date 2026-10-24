# Wiki Klassy

Wiki privada para la documentación del proyecto: PDF, Word, diagramas draw.io, texto, imágenes, Excel y PowerPoint.
Sin sesión no se ve nada. Stack igual que Klassy: Express + TypeScript + MongoDB / React + Vite + Tailwind + TanStack Query.

## Arrancar

1. Inicia MongoDB (en Windows: `net start MongoDB` desde una consola de administrador).
2. Backend:
   ```
   cd backend
   cp .env.example .env        # ya existe un .env de desarrollo; en producción define JWT_SECRET (32+ caracteres)
   npm run crear-admin -- tucorreo@dominio.com "Tu Nombre" "una-contraseña-de-10+"
   npm run dev                 # http://localhost:4100
   ```
3. Frontend: `cd frontend && npm run dev` → http://localhost:5174

Pruebas: `cd backend && npm test`.

## Permisos

Dos roles: **ADMIN** (ve y descarga todo, sube contenido, gestiona usuarios) y **USUARIO** (solo lo que se le conceda).

Cada permiso de un usuario define: **sección** (o toda la wiki; cubre sus subsecciones), **tipos de archivo**
(ej. solo diagramas), **ver** (siempre) y **descargar** (opcional), y una **vigencia** (sin límite, 30 min, 2 h, 1 día… o fecha).
Los permisos vencidos o revocados se conservan como historial. Además la cuenta puede tener su propio vencimiento
y se puede **suspender** sin borrar nada: al reactivarla conserva sus permisos.

Registro: cualquiera puede solicitar acceso, pero la cuenta queda `PENDIENTE` y no puede entrar hasta que un admin la apruebe.

## Asistente

Botón flotante (arrastrable) como el de Klassy. Lleva directo al documento exacto, no solo a la sección
(«llévame al diagrama de Boletín del periodo y su publicación»). Solo conoce lo que el usuario puede ver.
Con `ANTHROPIC_API_KEY` en `backend/.env` usa Claude; sin ella usa búsqueda local por palabras (títulos, etiquetas,
sección y tipo: «diagrama» ⇒ archivos draw.io). **Pon buenas etiquetas al subir documentos**: mejoran mucho la búsqueda.

## Límites conocidos

- Quien puede *ver* un documento recibe sus bytes en el navegador, así que técnicamente podría guardarlos; «sin descarga» oculta
  el botón y bloquea el endpoint de descarga, pero no es DRM.
- El visor de draw.io carga `embed.diagrams.net` (necesita internet); el contenido del diagrama se pasa por `postMessage`, no se sube.
- El token de sesión se guarda en `localStorage` (igual que Klassy).
