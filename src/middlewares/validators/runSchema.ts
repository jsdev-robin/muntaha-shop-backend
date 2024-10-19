import { NextFunction, Request, Response } from 'express';
import { Result, validationResult } from 'express-validator';
import ApiError from '../error/ApiError';
import HttpStatusCode from '../../utils/httpStatusCode';

interface ValidationError {
  msg: string;
}

export const runSchema = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors: Result<ValidationError> = validationResult(req);
  if (!errors.isEmpty()) {
    next(
      new ApiError(errors.array()[0].msg, HttpStatusCode.UNPROCESSABLE_ENTITY)
    );
    return;
  }
  next();
};
