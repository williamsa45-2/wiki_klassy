import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { env } from '../config/env';
import * as asistente from '../controllers/asistente.controller';
import * as authCtl from '../controllers/auth.controller';
import * as documentoCtl from '../controllers/documento.controller';
import * as seccionCtl from '../controllers/seccion.controller';
import * as usuarioCtl from '../controllers/usuario.controller';
import { autenticar, soloAdmin } from '../middlewares/auth.middleware';
import { validar } from '../middlewares/validate.middleware';
import catchAsync from '../utils/catchAsync';
import * as v from '../validators/esquemas';

const router = Router();
const limitar = (ventanaMin: number, max: number) =>
  rateLimit({ windowMs: ventanaMin * 60_000, limit: max, standardHeaders: true, legacyHeaders: false, message: { message: 'Demasiados intentos, espera un momento.' } });
const subida = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.maxArchivoMb * 1024 * 1024, files: 1 } }).single('archivo');

// Públicas: solo registro (queda pendiente) e inicio de sesión. Todo lo demás exige sesión.
router.post('/auth/registro', limitar(60, 10), validar(v.registro), catchAsync(authCtl.registro));
router.post('/auth/login', limitar(15, 20), validar(v.login), catchAsync(authCtl.login));

router.use(autenticar);

router.get('/auth/yo', authCtl.yo);
router.post('/auth/cambiar-password', limitar(15, 10), validar(v.cambioPassword), catchAsync(authCtl.cambiarPassword));

router.get('/secciones', catchAsync(seccionCtl.listar));
router.get('/documentos', catchAsync(documentoCtl.listar));
router.get('/documentos/:id', catchAsync(documentoCtl.obtener));
router.get('/documentos/:id/archivo', catchAsync(documentoCtl.archivo));
router.post('/asistente/orientar', limitar(1, 30), validar(v.pregunta), catchAsync(asistente.orientarPregunta));

// Administración.
router.use(soloAdmin);

router.post('/secciones', validar(v.seccionNueva), catchAsync(seccionCtl.crear));
router.patch('/secciones/:id', validar(v.seccionEdicion), catchAsync(seccionCtl.actualizar));
router.delete('/secciones/:id', catchAsync(seccionCtl.eliminar));

router.post('/documentos', subida, validar(v.documentoNuevo), catchAsync(documentoCtl.crear));
router.patch('/documentos/:id', validar(v.documentoEdicion), catchAsync(documentoCtl.actualizar));
router.put('/documentos/:id/archivo', subida, catchAsync(documentoCtl.reemplazarArchivo));
router.delete('/documentos/:id', catchAsync(documentoCtl.eliminar));

router.get('/usuarios', catchAsync(usuarioCtl.listar));
router.post('/usuarios/:id/aprobar', validar(v.aprobacion), catchAsync(usuarioCtl.aprobar));
router.post('/usuarios/:id/rechazar', catchAsync(usuarioCtl.rechazar));
router.patch('/usuarios/:id/estado', validar(v.estadoUsuario), catchAsync(usuarioCtl.cambiarEstado));
router.patch('/usuarios/:id/rol', validar(v.rolUsuario), catchAsync(usuarioCtl.cambiarRol));
router.patch('/usuarios/:id/acceso-hasta', validar(v.accesoHasta), catchAsync(usuarioCtl.fijarAccesoHasta));
router.post('/usuarios/:id/password', validar(v.nuevaPassword), catchAsync(usuarioCtl.restablecerPassword));

router.get('/usuarios/:id/permisos', catchAsync(usuarioCtl.listarPermisos));
router.post('/usuarios/:id/permisos', validar(v.permisoNuevo), catchAsync(usuarioCtl.otorgarPermiso));
router.patch('/permisos/:permisoId', validar(v.permisoEdicion), catchAsync(usuarioCtl.actualizarPermiso));
router.post('/permisos/:permisoId/revocar', catchAsync(usuarioCtl.revocarPermiso));

router.get('/actividad', catchAsync(asistente.actividad));

export default router;
