import { Document, Schema, Types, model } from 'mongoose';
import { TIPOS_ARCHIVO, TipoArchivo } from '../constants/enums';

export interface DocumentoDocument extends Document {
  titulo: string;
  descripcion: string;
  seccion_id: Types.ObjectId;
  etiquetas: string[];
  tipo: TipoArchivo;
  archivo: {
    nombre_original: string;
    /** Nombre en disco: aleatorio, nunca el que mandó el usuario. */
    nombre_guardado: string;
    mime: string;
    tamano: number;
    sha256: string;
  };
  subido_por: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const documentoSchema = new Schema<DocumentoDocument>(
  {
    titulo: { type: String, required: true, trim: true, maxlength: 200 },
    descripcion: { type: String, default: '', maxlength: 1000 },
    seccion_id: { type: Schema.Types.ObjectId, ref: 'Seccion', required: true, index: true },
    etiquetas: { type: [String], default: [] },
    tipo: { type: String, enum: Object.values(TIPOS_ARCHIVO), required: true },
    archivo: {
      nombre_original: { type: String, required: true },
      nombre_guardado: { type: String, required: true },
      mime: { type: String, required: true },
      tamano: { type: Number, required: true },
      sha256: { type: String, required: true },
    },
    subido_por: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default model<DocumentoDocument>('Documento', documentoSchema);
