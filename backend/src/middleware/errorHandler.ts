import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public fields?: Record<string, string>;

  constructor(message: string, statusCode: number, fields?: Record<string, string>) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.fields = fields;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error & { name?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      ...(err.fields ? { fields: err.fields } : {}),
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return;
  }

  if (err.name === 'CastError') {
    res.status(400).json({ message: 'Invalid id or value format' });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    message: 'Internal server error',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
