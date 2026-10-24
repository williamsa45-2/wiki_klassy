import { useState } from 'react';
import type { Vigencia } from '../../types/api';
import { Input, Select } from './Field';

const PRESETS: { valor: string; texto: string; minutos: number | null }[] = [
  { valor: 'sin', texto: 'Sin vencimiento', minutos: null },
  { valor: '30', texto: '30 minutos', minutos: 30 },
  { valor: '120', texto: '2 horas', minutos: 120 },
  { valor: '1440', texto: '1 día', minutos: 1440 },
  { valor: '10080', texto: '7 días', minutos: 10080 },
  { valor: '43200', texto: '30 días', minutos: 43200 },
];

interface Props {
  label?: string;
  onChange: (vigencia: Vigencia) => void;
  hint?: string;
}

/**
 * «¿Por cuánto tiempo?»: duración predefinida (la cuenta el servidor desde que se guarda) o una fecha y hora exacta.
 * Emite `{}` cuando no hay vencimiento.
 */
export function SelectorVigencia({ label = 'Vigencia', onChange, hint }: Props) {
  const [valor, setValor] = useState('sin');

  function elegir(nuevo: string) {
    setValor(nuevo);
    if (nuevo === 'fecha') return onChange({});
    const preset = PRESETS.find((p) => p.valor === nuevo);
    onChange(preset?.minutos ? { duracion_minutos: preset.minutos } : {});
  }

  return (
    <div className="space-y-2">
      <Select label={label} value={valor} onChange={(e) => elegir(e.target.value)} hint={hint}>
        {PRESETS.map((p) => (
          <option key={p.valor} value={p.valor}>
            {p.texto}
          </option>
        ))}
        <option value="fecha">Hasta una fecha y hora…</option>
      </Select>
      {valor === 'fecha' && (
        <Input
          label="Vence el"
          type="datetime-local"
          onChange={(e) => onChange(e.target.value ? { hasta: new Date(e.target.value).toISOString() } : {})}
        />
      )}
    </div>
  );
}
