import { Request, Response, NextFunction } from 'express';

export interface HttpError extends Error {
  status?: number;
  details?: unknown;
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return function (req: Request, res: Response, next: NextFunction) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = err.status ?? 500;
  const message = err.message || 'Server error';
  const details = err.details;

  res.status(status).json({ message, details });
}
