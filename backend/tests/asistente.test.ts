import { describe, expect, it } from 'vitest';
import { DestinoAsistente, SINONIMOS_TIPO, buscarLocal, destinoClaro, validarRespuesta } from '../src/utils/asistente';

const doc = (id: string, nombre: string, contexto: string, tipo = 'DRAWIO', etiquetas: string[] = []): DestinoAsistente => ({
  id: `documento:${id}`,
  tipo: 'DOCUMENTO',
  nombre,
  ruta: `/documentos/${id}`,
  contexto,
  etiquetas,
  claves: SINONIMOS_TIPO[tipo] ?? [],
});

const destinos = [
  doc('1', 'Diagrama de secuencia: boletín del periodo y su publicación', 'Diagramas / Académico', 'DRAWIO', ['boletin']),
  doc('2', 'Diagrama de secuencia: toma de asistencia', 'Diagramas / Académico'),
  doc('3', 'Historias de usuario: boletín del periodo', 'Historias de usuario / Backend', 'DOCX'),
  doc('4', 'Historias de usuario: asistencia', 'Historias de usuario / Backend', 'DOCX'),
  { id: 'seccion:9', tipo: 'SECCION', nombre: 'Diagramas', ruta: '/biblioteca?seccion=9', contexto: 'Diagramas', etiquetas: [], claves: [] } as DestinoAsistente,
];

describe('buscarLocal', () => {
  it('encuentra el diagrama exacto con una frase natural', () => {
    const r = buscarLocal('quiero que me lleves a ver el diagramas de Boletín del periodo y su publicación', destinos);
    expect(r[0]?.destino.id).toBe('documento:1');
    expect(destinoClaro(r)?.destino.id).toBe('documento:1');
  });

  it('distingue historias de diagramas del mismo tema', () => {
    const r = buscarLocal('historias de usuario del boletín', destinos);
    expect(r[0]?.destino.id).toBe('documento:3');
  });

  it('con una pregunta ambigua no elige sola', () => {
    const r = buscarLocal('diagrama', destinos);
    expect(destinoClaro(r)).toBeNull();
    expect(r.length).toBeGreaterThan(1);
  });

  it('sin coincidencias devuelve vacío', () => {
    expect(buscarLocal('receta de arepas', destinos)).toEqual([]);
  });
});

describe('validarRespuesta', () => {
  it('descarta ids que no estaban en la lista', () => {
    const r = validarRespuesta({ destino_id: 'documento:999', alternativas: ['documento:2', 'inventado'], mensaje: 'ok' }, destinos);
    expect(r.destino).toBeNull();
    expect(r.alternativas.map((a) => a.id)).toEqual(['documento:2']);
  });

  it('acepta un destino válido y limpia alternativas repetidas', () => {
    const r = validarRespuesta({ destino_id: 'documento:1', alternativas: ['documento:1', 'documento:2', 'documento:2'], mensaje: 'Te llevo.' }, destinos);
    expect(r.destino?.id).toBe('documento:1');
    expect(r.alternativas.map((a) => a.id)).toEqual(['documento:2']);
  });
});
