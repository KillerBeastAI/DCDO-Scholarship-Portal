import { Request, Response, NextFunction } from 'express';
import { isProduction } from '../config/env.js';

export interface CustomError extends Error {
  statusCode?: number;
  details?: unknown;
}

/**
 * Global Express error handling middleware.
 */
export function errorHandlerMiddleware(
  err: CustomError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  console.error('[error]', {
    statusCode,
    message,
    stack: isProduction ? undefined : err.stack,
  });

  res.status(statusCode).json({
    error: message,
    ...(err.details ? { details: err.details } : {}),
    ...(isProduction ? {} : { stack: err.stack }),
  });
}
