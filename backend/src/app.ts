import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { pathToFileURL } from 'node:url';
import { AppDataSource } from './data-source.js';
import { router as movieRouter } from './routes/movies.js';
import { searchRouter } from './routes/search.js';
import { detailsRouter } from './routes/details.js';
import { InputError } from './utils/errors.js';
import './utils/httpPolicy.js';

dotenv.config();

export function createApp() {
  const app = express();
  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',').map(value => value.trim()).filter(Boolean);
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({ origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new InputError('Origin is not allowed'));
  } }));
  app.use(express.json({ limit: '64kb' }));
  const externalRequestsLimiter = rateLimit({
    windowMs: 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false,
  });
  app.get('/health', (_req, res) => { res.json({ status: 'ok' }); });
  app.use('/movies', movieRouter);
  app.use('/search', externalRequestsLimiter, searchRouter);
  app.use('/details', externalRequestsLimiter, detailsRouter);
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction): void => {
    console.error(err);
    if (err instanceof InputError) { res.status(400).json({ error: err.message }); return; }
    if (err?.name === 'EntityNotFoundError') { res.status(404).json({ error: 'Not found' }); return; }
    res.status(500).json({ error: 'Internal error' });
  });
  return app;
}

export async function bootstrap() {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  const port = process.env.PORT ?? 4000;
  createApp().listen(port, () => console.log(`API ready on http://localhost:${port}`));
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entryPoint) {
  bootstrap().catch(error => { console.error(error); process.exitCode = 1; });
}
