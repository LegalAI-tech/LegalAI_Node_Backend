import type { Request, Response, NextFunction } from 'express';

const rawAllowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'https://www.legalai.software'
].filter(Boolean) as string[];

const allowedOrigins = new Set(
  rawAllowedOrigins.map(o => o.replace(/\/$/, ''))
);

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;

  if (origin) {
    const normalizedOrigin = origin.replace(/\/$/, '');

    if (allowedOrigins.has(normalizedOrigin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');

      res.header('Access-Control-Allow-Credentials', 'true');

      res.header(
        'Access-Control-Allow-Methods',
        'GET,POST,PUT,DELETE,PATCH,OPTIONS'
      );

      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-Id'
      );
      // Without this the browser hides these response headers from frontend code
      res.header(
        'Access-Control-Expose-Headers',
        'X-Request-Id, Content-Disposition, X-Document-Id, X-Generation-Status, X-Completion-Percentage, X-Generation-Warning'
      );
    }
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
}
