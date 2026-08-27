import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import router from './app/routes/index';
import globalErrorHandler from './app/middleware/globalErrorHandler';
import notFound from './app/middleware/notFound';
import morgan from 'morgan';
// import { stripeWebhookHandler } from './app/webhook/webhook.stripe';

import helmet from 'helmet';
import mongoSanitizeMiddleware from './app/middleware/mongosanitize';
import { setupSwagger } from './swagger';
import { globalLimiter } from './app/middleware/rateLimiter';

const app: Application = express();

// --- CRITICAL FOR PROXY/NGINX/AWS ---
// Must be configured before rate limiters to resolve real client IP
app.set('trust proxy', 1);

// --- HIGH SECURITY MIDDLEWARES ---
app.use(helmet({
  contentSecurityPolicy: false, // Disabled to allow Swagger UI inline scripts
})); // HTTP headers security
app.use(mongoSanitizeMiddleware);// NoSQL injection protection (e.g: email: {"$gt": ""})

app.use(express.json({ limit: '10kb' })); // body size limit 10kb, to prevent DoS attacks

// Handle JSON parse errors gracefully (e.g., empty body with Content-Type: application/json)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err && (err as any).type === 'entity.parse.failed') {
    res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
    });
  } else {
    next(err);
  }
});

app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(
  cors({
    origin: [
      'http://localhost:5175',
      'http://localhost:5173', 
      'http://localhost:5174', 
      'http://localhost:3000',
      'http://localhost:3001',
      'http://3.226.133.13',
      'http://3.226.133.13/dashboard', 
      'https://weplan.com.pk',
      'https://weplan.pk',
      'https://dev.weplan.com.pk',
      'https://admin.weplan.com.pk',
      'https://preview.weplan.com.pk'
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  }) 
);

app.use(morgan('dev'));

// --- RATE LIMITING ---
app.use('/api/v1', globalLimiter);

// --- TEST IP ENDPOINT ---
app.get('/api/v1/test-ip', (req: Request, res: Response) => {
  const xForwardedFor = req.headers['x-forwarded-for'];
  const clientIp = xForwardedFor
    ? (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor).split(',')[0].trim()
    : req.ip || req.socket.remoteAddress;

  res.json({
    success: true,
    message: 'Client IP Details',
    data: {
      reqIp: req.ip,
      clientIp: clientIp,
      xForwardedFor: req.headers['x-forwarded-for'] || null,
      xRealIp: req.headers['x-real-ip'] || null,
    },
  });
});

app.use('/api/v1', router);

app.get('/', (req: Request, res: Response) => {
  res.send('WeePlan - Server is Breathing...');
});

// setup Swagger
setupSwagger(app);

app.use(globalErrorHandler);
app.use(notFound);

export default app;