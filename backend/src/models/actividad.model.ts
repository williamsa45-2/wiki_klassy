import { Document, Schema, Types, model } from 'mongoose';
import { ACCIONES_ACTIVIDAD, AccionActividad } from '../constants/enums';

export interface ActividadDocument extends Document {
  usuario_id: Types.ObjectId | null;
  accion: AccionActividad;
  documento_id: Types.ObjectId | null;
  /** Texto corto legible: nunca contenido de documentos ni contraseñas. */
  detalle: string;
  ip: string;
  createdAt: Date;
}

const actividadSchema = new Schema<ActividadDocument>(
  {
    usuario_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    accion: { type: String, enum: Object.values(ACCIONES_ACTIVIDAD), required: true },
    documento_id: { type: Schema.Types.ObjectId, ref: 'Documento', default: null },
    detalle: { type: String, default: '', maxlength: 300 },
    ip: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

actividadSchema.index({ createdAt: -1 });

export default model<ActividadDocument>('Actividad', actividadSchema);
