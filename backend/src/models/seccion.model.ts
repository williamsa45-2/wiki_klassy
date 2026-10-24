import { Document, Schema, Types, model } from 'mongoose';

export interface SeccionDocument extends Document {
  nombre: string;
  descripcion: string;
  /** null = sección de primer nivel. */
  padre_id: Types.ObjectId | null;
  orden: number;
}

const seccionSchema = new Schema<SeccionDocument>(
  {
    nombre: { type: String, required: true, trim: true, maxlength: 120 },
    descripcion: { type: String, default: '', maxlength: 500 },
    padre_id: { type: Schema.Types.ObjectId, ref: 'Seccion', default: null },
    orden: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Dos secciones con el mismo nombre bajo el mismo padre no se distinguirían en el árbol ni para el asistente.
seccionSchema.index({ padre_id: 1, nombre: 1 }, { unique: true });

export default model<SeccionDocument>('Seccion', seccionSchema);
