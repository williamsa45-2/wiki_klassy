const PALABRAS_VACIAS = new Set([
  'a', 'al', 'como', 'con', 'cual', 'cuales', 'de', 'del', 'donde', 'el', 'en', 'es', 'esta', 'estan', 'hay', 'la', 'las', 'lo', 'los',
  'me', 'mi', 'mis', 'necesito', 'para', 'por', 'puedo', 'que', 'quiero', 'se', 'si', 'son', 'su', 'sus', 'un', 'una', 'unos', 'ver',
  'y', 'ir', 'llevame', 'lleves', 'llevar', 'abre', 'abrir', 'abras', 'muestrame', 'muestra', 'busco', 'buscar', 'quisiera', 'favor', 'y',
]);

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Raíz burda para que «diagramas» ≈ «diagrama» y «historias» ≈ «historia». */
export function raiz(palabra: string): string {
  return palabra.length > 4 ? palabra.replace(/(es|s)$/, '') : palabra;
}

export function tokensDeConsulta(consulta: string): string[] {
  return normalizar(consulta)
    .split(' ')
    .filter((t) => t && !PALABRAS_VACIAS.has(t));
}
