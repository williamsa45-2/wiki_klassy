import { describe, expect, it } from 'vitest';
import { accesoAlDocumento, Concesion, PadresDeSeccion, seccionesNavegables } from '../src/utils/permisos';

// raiz → historias → historias-backend ; raiz → diagramas
const padres: PadresDeSeccion = new Map([
  ['historias', null],
  ['historias-backend', 'historias'],
  ['diagramas', null],
]);
const ahora = new Date('2026-10-22T12:00:00Z');

const concesion = (parcial: Partial<Concesion>): Concesion => ({
  seccion_id: null,
  ver: true,
  descargar: false,
  tipos: [],
  desde: null,
  hasta: null,
  revocado: false,
  ...parcial,
});

describe('accesoAlDocumento', () => {
  it('sin permisos no hay acceso', () => {
    expect(accesoAlDocumento([], padres, 'diagramas', 'PDF', ahora)).toEqual({ ver: false, descargar: false });
  });

  it('un permiso en una sección cubre sus subsecciones, no las hermanas', () => {
    const c = [concesion({ seccion_id: 'historias' })];
    expect(accesoAlDocumento(c, padres, 'historias-backend', 'PDF', ahora).ver).toBe(true);
    expect(accesoAlDocumento(c, padres, 'diagramas', 'PDF', ahora).ver).toBe(false);
  });

  it('descargar exige ver aunque el permiso diga lo contrario', () => {
    const c = [concesion({ ver: false, descargar: true })];
    expect(accesoAlDocumento(c, padres, 'diagramas', 'PDF', ahora)).toEqual({ ver: false, descargar: false });
  });

  it('puede ver sin poder descargar', () => {
    const c = [concesion({ ver: true, descargar: false })];
    expect(accesoAlDocumento(c, padres, 'diagramas', 'PDF', ahora)).toEqual({ ver: true, descargar: false });
  });

  it('restringe por tipo de archivo', () => {
    const c = [concesion({ tipos: ['DRAWIO'] })];
    expect(accesoAlDocumento(c, padres, 'diagramas', 'DRAWIO', ahora).ver).toBe(true);
    expect(accesoAlDocumento(c, padres, 'diagramas', 'PDF', ahora).ver).toBe(false);
  });

  it('un permiso temporal deja de valer al vencer y no antes', () => {
    const c = [concesion({ hasta: new Date('2026-10-22T14:00:00Z') })];
    expect(accesoAlDocumento(c, padres, 'diagramas', 'PDF', ahora).ver).toBe(true);
    expect(accesoAlDocumento(c, padres, 'diagramas', 'PDF', new Date('2026-10-22T14:00:00Z')).ver).toBe(false);
  });

  it('no vale antes de su fecha de inicio ni si está revocado', () => {
    expect(accesoAlDocumento([concesion({ desde: new Date('2026-10-23T00:00:00Z') })], padres, 'diagramas', 'PDF', ahora).ver).toBe(false);
    expect(accesoAlDocumento([concesion({ revocado: true })], padres, 'diagramas', 'PDF', ahora).ver).toBe(false);
  });

  it('los permisos se suman', () => {
    const c = [concesion({ tipos: ['PDF'] }), concesion({ tipos: ['PDF'], descargar: true, seccion_id: 'diagramas' })];
    expect(accesoAlDocumento(c, padres, 'diagramas', 'PDF', ahora)).toEqual({ ver: true, descargar: true });
    expect(accesoAlDocumento(c, padres, 'historias', 'PDF', ahora).descargar).toBe(false);
  });
});

describe('seccionesNavegables', () => {
  it('incluye los ancestros para poder llegar a la sección con permiso', () => {
    const visibles = seccionesNavegables([concesion({ seccion_id: 'historias-backend' })], padres, ahora);
    expect([...visibles].sort()).toEqual(['historias', 'historias-backend']);
  });

  it('un permiso global ve todo; vencido, nada', () => {
    expect(seccionesNavegables([concesion({})], padres, ahora).size).toBe(3);
    expect(seccionesNavegables([concesion({ hasta: new Date('2026-10-22T11:00:00Z') })], padres, ahora).size).toBe(0);
  });
});
