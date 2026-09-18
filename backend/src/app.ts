import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';
import { seedAdmin } from './utils/seedAdmin';
import { checkDeadlines } from './services/deadlineService';

import authRoutes from './routes/authRoutes';
import studentRoutes from './routes/studentRoutes';
import supervisorRoutes from './routes/supervisorRoutes';
import adminRoutes from './routes/adminRoutes';

const DEADLINE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours

const app = express();

// Trust one proxy hop so rate limiting keys on real client IPs behind a reverse proxy.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',').map(s => s.trim()) : true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later' },
});
app.use('/api', limiter);

// Stricter tier for the brute-forceable auth surface (OTP verify, login, register, refresh).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  message: { message: 'Too many auth attempts, please try again later' },
});
app.use('/api/auth', authLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/supervisor', supervisorRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorHandler);

const startDeadlineScheduler = () => {
  const run = async () => {
    await checkDeadlines({ daysAhead: 7, log: true });
  };
  run();
  const interval = setInterval(run, DEADLINE_CHECK_INTERVAL_MS);
  return interval;
};

const start = async () => {
  await connectDB();
  await seedAdmin();
  const schedulerInterval = startDeadlineScheduler();

  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
    console.log(`Environment: ${env.NODE_ENV}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

const shutdown = () => { process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
