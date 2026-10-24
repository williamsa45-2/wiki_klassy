import mongoose from 'mongoose';
import app from './app';
import { env } from './config/env';

async function iniciar() {
  await mongoose.connect(env.mongoUri);
  app.listen(env.port, () => console.log(`Wiki Klassy (API) en http://localhost:${env.port}`));
}

iniciar().catch((error) => {
  console.error('No se pudo iniciar el servidor', error);
  process.exit(1);
});
