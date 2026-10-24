import mongoose from 'mongoose';
import { env } from '../src/config/env';
import { ESTADOS_USUARIO, ROLES } from '../src/constants/enums';
import User from '../src/models/user.model';
import { hashearPassword } from '../src/services/auth.service';

// Uso: npm run crear-admin -- correo@dominio.com "Nombre Apellido" "contraseña de 10 o más caracteres"
async function main() {
  const [email, nombre, password] = process.argv.slice(2);
  if (!email || !nombre || !password || password.length < 10) {
    throw new Error('Uso: npm run crear-admin -- <correo> "<nombre>" "<contraseña de al menos 10 caracteres>"');
  }
  await mongoose.connect(env.mongoUri);
  const existente = await User.findOne({ email: email.toLowerCase() });
  if (existente) {
    existente.rol = ROLES.ADMIN;
    existente.estado = ESTADOS_USUARIO.ACTIVO;
    existente.acceso_hasta = null;
    existente.password_hash = await hashearPassword(password);
    existente.version_sesion += 1;
    await existente.save();
    console.log(`Cuenta existente convertida en ADMIN: ${email}`);
  } else {
    await User.create({ nombre, email, password_hash: await hashearPassword(password), rol: ROLES.ADMIN, estado: ESTADOS_USUARIO.ACTIVO });
    console.log(`ADMIN creado: ${email}`);
  }
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
