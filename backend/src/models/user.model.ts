import { Document, Schema, model } from 'mongoose';
import { ESTADOS_USUARIO, EstadoUsuario, ROLES, Rol } from '../constants/enums';

export interface UserDocument extends Document {
  nombre: string;
  email: string;
  password_hash: string;
  rol: Rol;
  estado: EstadoUsuario;
  /** Mensaje del solicitante al pedir acceso. */
  motivo_solicitud: string;
  /** Cuenta temporal: pasada esta fecha no puede entrar, pero el usuario y sus permisos se conservan (el admin la extiende y vuelve). */
  acceso_hasta: Date | null;
  /** Se incrementa para cerrar todas las sesiones abiertas (cambio de rol, suspensión, nueva contraseña). */
  version_sesion: number;
  ultimo_acceso: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    nombre: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 160 },
    password_hash: { type: String, required: true, select: false },
    rol: { type: String, enum: Object.values(ROLES), default: ROLES.USUARIO },
    estado: { type: String, enum: Object.values(ESTADOS_USUARIO), default: ESTADOS_USUARIO.PENDIENTE },
    motivo_solicitud: { type: String, default: '', maxlength: 500 },
    acceso_hasta: { type: Date, default: null },
    version_sesion: { type: Number, default: 0 },
    ultimo_acceso: { type: Date, default: null },
  },
  { timestamps: true }
);

export default model<UserDocument>('User', userSchema);
