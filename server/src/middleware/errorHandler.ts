import { Request, Response, NextFunction } from 'express';

export function errorHandler(error: any, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', error);

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.message
    });
  }

  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized'
    });
  }

  res.status(500).json({
    error: 'Internal server error'
  });
}