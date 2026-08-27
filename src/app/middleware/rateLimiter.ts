import { Request } from 'express';
import rateLimit from 'express-rate-limit';

// Helper to safely extract real client IP behind proxies (Nginx, Cloudflare, AWS ALB)
const getClientIp = (req: Request): string => {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const ips = (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor).split(',');
    return ips[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
};

// General Rate Limiter for all APIs (15 minutes, 500 requests per IP)
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => getClientIp(req),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

// Strict Rate Limiter for Auth / Sensitive Endpoints (5 minutes, 5 attempts per IP)
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => getClientIp(req),
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 5 minutes.',
  },
});
