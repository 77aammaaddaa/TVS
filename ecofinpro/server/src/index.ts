import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger';
import { env } from './utils/env';
import authRoutes from './routes/auth';
import superAdminRoutes from './routes/superAdmin';
import usersRoutes from './routes/users';
import auditRoutes from './routes/audit';
import dataBridgeRoutes from './routes/dataBridge';
import posRoutes from './routes/pos';
import customersRoutes from './routes/customers';
import partnerRoutes from './routes/partners';
import inventoryRoutes from './routes/inventory';
import purchasesRoutes from './routes/purchases';
import suppliersRoutes from './routes/suppliers';
import surveysRoutes from './routes/surveys';
import shiftsRoutes from './routes/shifts';
import vaultsRoutes from './routes/vaults';
import purchaseReturnsRoutes from './routes/purchaseReturns';
import vaultsManageRoutes from './routes/vaultsManage';
import dashboardRoutes from './routes/dashboard';
import settingsRoutes from './routes/settings';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';


const app = express();

// Replace with your actual Vercel frontend URL
const FRONTEND_URL = env.FRONTEND_URL || 'https://ecofinepro.vercel.app';
const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json());

// Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // 300 requests per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Please slow down.' }
});

app.use('/api/auth', authLimiter);
app.use('/api/', apiLimiter);

// Simple request logger to capture incoming requests in Railway logs
app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url, ip: req.ip }, 'Incoming request');
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/sa', superAdminRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/data-bridge', dataBridgeRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/surveys', surveysRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/vaults', vaultsRoutes);
app.use('/api/purchase-returns', purchaseReturnsRoutes);
app.use('/api/vaults/manage', vaultsManageRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.get('/', (req, res) => res.status(200).json({ status: 'ok', service: 'ecofin-pro-server' }));
app.get('/health', (req, res) => res.sendStatus(200));

// Must be last: 404 fallback, then the global error handler.
app.use(notFoundHandler);
app.use(errorHandler);

export const startServer = () => {
  const PORT = env.PORT;
  const server = app.listen(PORT, '0.0.0.0', () => logger.info({ port: PORT }, 'Server running'));

  const shutdown = () => {
    logger.info('Shutting down gracefully');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return server;
};

if (require.main === module) {
  startServer();
}

// Global error handlers to log uncaught exceptions/rejections for debugging
process.on('uncaughtException', (err) => {
  logger.error({ err: err instanceof Error ? err.stack : err }, 'uncaughtException');
  // Let the process crash after logging — Railway will capture the logs
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason: reason instanceof Error ? reason.stack : reason }, 'unhandledRejection');
});

export default app;