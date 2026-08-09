import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/error.js';
import routes from './routes/index.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || env.clientOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

if (!env.isProd) {
  const { default: morgan } = await import('morgan');
  app.use(morgan('dev'));
}

app.get('/', (_req, res) => {
  res.json({ name: 'Portfolio API', status: 'running', docs: '/api/health' });
});

app.use('/api', apiLimiter, routes);

app.use(notFound);
app.use(errorHandler);

export default app;
