import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, notFound } from './middlewares/error.middleware';
import routes from './routes';

const app = express();

app.set('trust proxy', env.proxiesConfiables);
app.use(helmet());
app.use(cors({ origin: env.frontendUrl, exposedHeaders: ['Content-Disposition'] }));
app.use(express.json({ limit: '100kb' }));
if (env.nodeEnv !== 'test') app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
app.use('/api/v1', routes);
app.use(notFound);
app.use(errorHandler);

export default app;
