import { Document, Schema, Types, model } from 'mongoose';
import { TIPOS_ARCHIVO, TipoArchivo } from '../constants/enums';

export interface PermisoDocument extends Document {
  usuario_id: Types.ObjectId;
  /** null = toda la wiki. */
  seccion_id: Types.ObjectId | null;
  ver: boolean;
  descargar: boolean;
  /** Vacío = cualquier tipo de archivo. */
  tipos: TipoArchivo[];
  desde: Date | null;
  /** Permiso temporal: vence solo, sin borrar nada. */
  hasta: Date | null;
  /** Revocar no borra: queda el historial de a quién se le dio acceso. */
  revocado_en: Date | null;
  otorgado_por: Types.ObjectId;
  nota: string;
}

const permisoSchema = new Schema<PermisoDocument>(
  {
    usuario_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seccion_id: { type: Schema.Types.ObjectId, ref: 'Seccion', default: null },
    ver: { type: Boolean, default: true },
    descargar: { type: Boolean, default: false },
    tipos: { type: [String], enum: Object.values(TIPOS_ARCHIVO), default: [] },
    desde: { type: Date, default: null },
    hasta: { type: Date, default: null },
    revocado_en: { type: Date, default: null },
    otorgado_por: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    nota: { type: String, default: '', maxlength: 300 },
  },
  { timestamps: true }
);

export default model<PermisoDocument>('Permiso', permisoSchema);
