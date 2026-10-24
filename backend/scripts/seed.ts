import mongoose from 'mongoose';
import { env } from '../src/config/env';
import { ESTADOS_USUARIO, ROLES } from '../src/constants/enums';
import User from '../src/models/user.model';
import { hashearPassword } from '../src/services/auth.service';

// Admin de desarrollo. La contraseña no cumple el mínimo de 10 del registro: se crea directo en la base,
// y el login no exige largo mínimo. Cambiarla antes de usar la wiki en producción.
const ADMIN_SEMILLA = { nombre: 'Administrador', email: 'admin@gmail.com', password: '12345678' };

async function main() {
  await mongoose.connect(env.mongoUri);
  const existente = await User.findOne({ email: ADMIN_SEMILLA.email });
  if (existente) {
    console.log(`El admin semilla ya existe, no se modifica: ${ADMIN_SEMILLA.email}`);
  } else {
    await User.create({
      nombre: ADMIN_SEMILLA.nombre,
      email: ADMIN_SEMILLA.email,
      password_hash: await hashearPassword(ADMIN_SEMILLA.password),
      rol: ROLES.ADMIN,
      estado: ESTADOS_USUARIO.ACTIVO,
    });
    console.log(`Admin semilla creado: ${ADMIN_SEMILLA.email}`);
  }
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
