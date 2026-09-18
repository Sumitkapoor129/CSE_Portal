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

  if (err.name === 'MulterError') {
    res.status(400).json({ message: 'File upload error. Max file size is 10MB.' });
    return;
  }

  // Mongoose duplicate-key (unique index) violation -> 409 Conflict
  if ((err as { code?: number }).code === 11000) {
    res.status(409).json({
      message: 'A record with that value already exists. Please check for duplicates and try again.',
    });
    return;
  }

  // Mongoose validation failure -> 400 with per-field messages
  if (err.name === 'ValidationError') {
    const fields: Record<string, string> = {};
    const rawErrors = (err as unknown as { errors?: Record<string, { message: string }> }).errors;
    for (const [key, error] of Object.entries(rawErrors ?? {})) {
      fields[key] = error.message;
    }
    res.status(400).json({ message: 'Validation failed', fields });
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
