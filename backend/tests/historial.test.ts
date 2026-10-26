import type { Request } from 'express';
import fs from 'fs';
import { describe, expect, it, vi } from 'vitest';
import * as servicio from '../src/services/actividad.service';

// env se lee al importar: vi.hoisted corre antes que los import, así el servicio ya ve el archivo de prueba.
const archivo = vi.hoisted(() => {
  const ruta = `${require('os').tmpdir()}/historial-${process.pid}-${Date.now()}.jsonl`;
  process.env.ARCHIVO_HISTORIAL = ruta;
  return ruta;
});
const req = (nombre?: string) => ({ ip: '10.0.0.1', user: nombre ? { _id: 'u1', nombre, email: `${nombre}@x.co` } : undefined }) as unknown as Request;

describe('historial en archivo plano', () => {
  it('sin archivo todavía, el historial está vacío', async () => {
    expect(await servicio.listarActividad()).toEqual([]);
  });

  it('agrega una línea por evento y lee lo más reciente primero', async () => {
    await Promise.all([
      servicio.registrarActividad(req('ana'), { accion: 'SUBIR', documentoId: 'd1', detalle: 'Diagrama (a.drawio)' }),
      servicio.registrarActividad(req('ana'), { accion: 'VER', documentoId: 'd1' }),
      servicio.registrarActividad(req('ana'), { accion: 'NUEVA_VERSION', documentoId: 'd1', detalle: 'Diagrama (b.drawio)' }),
      servicio.registrarActividad(req('ana'), { accion: 'SECCION_CREADA', detalle: 'Backend' }),
    ]);
    expect(fs.readFileSync(archivo, 'utf8').trim().split('\n')).toHaveLength(4);
    const todo = await servicio.listarActividad();
    expect(todo.map((e) => e.accion)).toEqual(['SECCION_CREADA', 'NUEVA_VERSION', 'VER', 'SUBIR']);
    expect(todo[0]?.usuario).toEqual({ id: 'u1', nombre: 'ana', email: 'ana@x.co' });
  });

  it('filtra solo cambios y por documento', async () => {
    const delDocumento = await servicio.listarActividad(100, { documentoId: 'd1', soloCambios: true });
    expect(delDocumento.map((e) => e.accion)).toEqual(['NUEVA_VERSION', 'SUBIR']);
  });

  it('una línea dañada se salta sin romper el resto', async () => {
    fs.appendFileSync(archivo, '{esto no es json\n');
    await servicio.registrarActividad(req(), { accion: 'LOGIN', usuario: { id: 'u2', nombre: 'luis', email: 'luis@x.co' } });
    const todo = await servicio.listarActividad();
    expect(todo).toHaveLength(5);
    expect(todo[0]?.usuario?.nombre).toBe('luis');
  });
});
