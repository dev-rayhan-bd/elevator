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
import rateLimit from 'express-rate-limit';
import mongoSanitizeMiddleware from './app/middleware/mongosanitize';

const app: Application = express();



// --- HIGH SECURITY MIDDLEWARES ---
app.use(helmet()); // HTTP headers security
app.use(mongoSanitizeMiddleware);// NoSQL injection protection (e.g: email: {"$gt": ""})

// --- RATE LIMITING ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, //14 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, 
  legacyHeaders: false, 
});
app.use('/api', limiter); 

app.use(express.json({ limit: '10kb' })); // bosy size limnit 10kb, to prevent DoS attacks

app.use(cookieParser());
app.set('trust proxy', 1);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(
  cors({
    origin: [
      'http://localhost:5175',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',

    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  })
);

// Stripe needs raw body for signature verification
// app.post(
//   '/webhook/stripe',
//   express.raw({ type: 'application/json' }),
//   stripeWebhookHandler
// );




app.use(morgan('dev'));
app.use('/api/v1', router);

app.get('/', (req: Request, res: Response) => {
  res.send('WeePlan - Server is Breathing...');
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;