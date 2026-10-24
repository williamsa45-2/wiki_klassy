import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useLocation, useMatch, useNavigate } from 'react-router-dom';
import { useDocumento, useSecciones } from '../../hooks/useBiblioteca';
import { useOrientarAsistente } from '../../hooks/useAsistente';
import type { DestinoAsistente } from '../../types/api';
import { Button } from '../ui/Button';
import { FileTextIcon, FolderIcon, MessageCircleIcon, SendIcon, SlidersIcon, XIcon } from '../ui/icons';
import { useBotonArrastrable } from './useBotonArrastrable';

interface Mensaje {
  id: number;
  autor: 'asistente' | 'usuario';
  texto: string;
  opciones?: DestinoAsistente[];
}

const TAMANO_BOTON = 56;
const SEPARACION = 12;
const ANCHO_PANEL = 384;
const ALTO_PANEL = 448;

const SALUDO: Mensaje = {
  id: 0,
  autor: 'asistente',
  texto: 'Hola, dime qué buscas (por ejemplo: «llévame al diagrama de Boletín del periodo y su publicación») y te llevo directo.',
};

const ICONO_DESTINO = { DOCUMENTO: FileTextIcon, SECCION: FolderIcon, PANTALLA: SlidersIcon } as const;

export function AsistenteFlotante() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [mensajes, setMensajes] = useState<Mensaje[]>([SALUDO]);
  const orientar = useOrientarAsistente();
  const finRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const contador = useRef(1);
  const { posicion, ventana, margen, debeIgnorarClic, handlers } = useBotonArrastrable(TAMANO_BOTON);

  // Dónde está la persona ahora: se le pasa al asistente solo para desambiguar («estoy en historias de usuario / backend»).
  const enDocumento = useMatch('/documentos/:id');
  const documentoActual = useDocumento(enDocumento?.params.id);
  const { data: secciones } = useSecciones();
  const seccionActual = secciones?.find((s) => s.id === new URLSearchParams(search).get('seccion'));
  const ubicacion = documentoActual.data
    ? `${documentoActual.data.ruta} › ${documentoActual.data.titulo}`
    : (seccionActual?.ruta ?? '');

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: 'end' });
  }, [mensajes, abierto]);

  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (e: PointerEvent) => {
      const objetivo = e.target as Node;
      if (panelRef.current?.contains(objetivo) || botonRef.current?.contains(objetivo)) return;
      setAbierto(false);
    };
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('pointerdown', alPresionar);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('pointerdown', alPresionar);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierto]);

  // El panel sigue al botón: alineado a su borde derecho, arriba si cabe y si no debajo, siempre dentro de la ventana.
  const anchoPanel = Math.min(ANCHO_PANEL, ventana.ancho - 2 * margen);
  const altoPanel = Math.min(ALTO_PANEL, ventana.alto - 2 * margen);
  const izquierdaPanel = Math.min(
    Math.max(posicion.x + TAMANO_BOTON - anchoPanel, margen),
    Math.max(margen, ventana.ancho - anchoPanel - margen)
  );
  const arribaDelBoton = posicion.y - SEPARACION - altoPanel;
  const debajoDelBoton = posicion.y + TAMANO_BOTON + SEPARACION;
  const arribaPanel =
    arribaDelBoton >= margen
      ? arribaDelBoton
      : debajoDelBoton + altoPanel <= ventana.alto - margen
        ? debajoDelBoton
        : Math.max(margen, ventana.alto - altoPanel - margen);

  function agregar(...nuevos: Omit<Mensaje, 'id'>[]) {
    setMensajes((actuales) => [...actuales, ...nuevos.map((m) => ({ ...m, id: contador.current++ }))]);
  }

  function irA(destino: DestinoAsistente) {
    if (destino.ruta === pathname + search) {
      agregar({ autor: 'asistente', texto: `Ya estás en «${destino.nombre}».` });
      return;
    }
    agregar({ autor: 'asistente', texto: `Te llevo a «${destino.nombre}».` });
    navigate(destino.ruta);
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    const pregunta = texto.trim();
    if (!pregunta) return;
    setTexto('');
    agregar({ autor: 'usuario', texto: pregunta });

    orientar.mutate(
      { pregunta, ubicacion },
      {
        onSuccess: (r) => {
          const otras = r.alternativas.length > 0 ? r.alternativas : undefined;
          if (r.destino) {
            agregar({ autor: 'asistente', texto: r.mensaje, opciones: otras });
            if (r.destino.ruta !== pathname + search) navigate(r.destino.ruta);
          } else {
            agregar({ autor: 'asistente', texto: r.mensaje, opciones: otras });
          }
        },
        onError: (error) => agregar({ autor: 'asistente', texto: error.message }),
      }
    );
  }

  return (
    <>
      {abierto && (
        <section
          ref={panelRef}
          aria-label="Asistente de la wiki"
          style={{ left: izquierdaPanel, top: arribaPanel, width: anchoPanel, height: altoPanel }}
          className="fixed z-40 flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
        >
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">Asistente</p>
              <p className="text-xs text-muted">Te llevo al documento o diagrama que buscas</p>
            </div>
            <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar asistente" className="rounded-full p-1.5 text-muted hover:bg-soft">
              <XIcon className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-soft px-4 py-3">
            {mensajes.map((m) => (
              <div key={m.id} className={m.autor === 'usuario' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.autor === 'usuario' ? 'bg-primary text-white' : 'bg-surface text-body ring-1 ring-inset ring-border'
                  }`}
                >
                  <p>{m.texto}</p>
                  {m.opciones && (
                    <div className="mt-2 flex flex-col gap-2">
                      {m.opciones.map((o) => {
                        const Icono = ICONO_DESTINO[o.tipo];
                        return (
                          <Button key={o.id} type="button" variant="soft-edit" className="h-auto justify-start py-2 text-left" onClick={() => irA(o)}>
                            <Icono className="h-4 w-4 shrink-0" />
                            <span className="min-w-0">
                              <span className="block truncate">{o.nombre}</span>
                              <span className="block truncate text-xs font-normal opacity-80">{o.contexto.split('. ')[0]}</span>
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {orientar.isPending && <p className="text-xs text-muted">Buscando…</p>}
            <div ref={finRef} />
          </div>

          <form onSubmit={enviar} className="flex items-center gap-2 border-t border-border px-3 py-3">
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="¿Qué estás buscando?"
              aria-label="Pregunta para el asistente"
              maxLength={500}
              className="block w-full rounded-lg border-0 px-3 py-2 text-sm text-ink ring-1 ring-inset ring-border placeholder:text-muted focus:ring-2 focus:ring-inset focus:ring-primary"
            />
            <Button type="submit" aria-label="Enviar" disabled={!texto.trim() || orientar.isPending} className="px-3">
              <SendIcon className="h-4 w-4" />
            </Button>
          </form>
        </section>
      )}

      <button
        ref={botonRef}
        type="button"
        {...handlers}
        onClick={() => {
          if (!debeIgnorarClic()) setAbierto((v) => !v);
        }}
        aria-label={abierto ? 'Cerrar asistente' : 'Abrir asistente (puedes arrastrarlo)'}
        aria-expanded={abierto}
        title="Arrastra para moverlo"
        style={{ left: posicion.x, top: posicion.y }}
        className="fixed z-40 flex h-14 w-14 cursor-grab touch-none select-none items-center justify-center rounded-full bg-primary text-white shadow-lg transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:cursor-grabbing"
      >
        {abierto ? <XIcon className="h-6 w-6" /> : <MessageCircleIcon className="h-6 w-6" />}
      </button>
    </>
  );
}
