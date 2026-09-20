import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';
import { seedAdmin } from './utils/seedAdmin';
import { checkDeadlines } from './services/deadlineService';
import { checkMilestoneReminders } from './services/reminderService';
import { backfillMilestoneMetadata } from './services/milestoneService';

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

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${Date.now() - start}ms`);
  });
  next();
});

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = value !== undefined ? parseInt(value, 10) : NaN;
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

const rateLimitWindowMs = parsePositiveInt(
  process.env.RATE_LIMIT_WINDOW_MS,
  15 * 60 * 1000,
);
const rateLimitMax = parsePositiveInt(process.env.RATE_LIMIT_MAX, 1000);
const authRateLimitMax = parsePositiveInt(process.env.AUTH_RATE_LIMIT_MAX, 30);

const limiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  standardHeaders: true,
  message: { message: 'Too many requests, please try again later' },
});
app.use('/api', limiter);

// Stricter tier ONLY for brute-forceable routes (login, register, verify-otp).
// High-frequency routes (GET /me, PUT /change-password, POST /refresh, POST /logout)
// are governed only by the global limiter above.
const authLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: authRateLimitMax,
  standardHeaders: true,
  message: { message: 'Too many auth attempts, please try again later' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/verify-otp', authLimiter);

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
  // Defer first run so it never contends with startup + first requests on a cold pool.
  setImmediate(run);
  const interval = setInterval(run, DEADLINE_CHECK_INTERVAL_MS);
  return interval;
};

const startMilestoneReminderScheduler = () => {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await checkMilestoneReminders({ log: true });
    } finally {
      running = false;
    }
  };
  setImmediate(run);
  const interval = setInterval(run, DEADLINE_CHECK_INTERVAL_MS);
  return interval;
};

let deadlineSchedulerHandle: NodeJS.Timeout | null = null;
let reminderSchedulerHandle: NodeJS.Timeout | null = null;

const start = async () => {
  await connectDB();
  // One-time legacy metadata backfill before any scheduler touches reminders.
  try {
    const result = await backfillMilestoneMetadata();
    console.log(`backfillMilestoneMetadata: updated ${result.updated} milestone docs`);
  } catch (err) {
    console.error('backfillMilestoneMetadata failed:', err);
  }
  await seedAdmin();
  deadlineSchedulerHandle = startDeadlineScheduler();
  reminderSchedulerHandle = startMilestoneReminderScheduler();

  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
    console.log(`Environment: ${env.NODE_ENV}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

const shutdown = () => {
  if (deadlineSchedulerHandle) clearInterval(deadlineSchedulerHandle);
  if (reminderSchedulerHandle) clearInterval(reminderSchedulerHandle);
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
