import { Request, Response, NextFunction } from 'express';
import ApiError from './ApiError';
import EnvConfig from '../../config/envConfig';

interface CustomError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
  path?: string;
  value?: string;
  code?: number;
  errmsg?: string;
  errors?: Record<string, { message: string }>;
  reason?: any;
}

// Enhanced Error Handlers
const handleInvalidFieldError = (err: CustomError): ApiError => {
  const message = `Invalid input provided for the ${err.path} field: "${err.value}". Please provide a valid value and try again.`;
  return new ApiError(message, 400);
};

const handleDuplicateValueError = (err: CustomError): ApiError => {
  const value = err.errmsg?.match(/(["'])(\\?.)*?\1/);
  const duplicateValue = value ? value[0] : '';
  const message = `The value ${duplicateValue} already exists. Duplicate entries are not allowed. Please choose a different value and try again.`;
  return new ApiError(message, 409);
};

const handleInputValidationError = (err: CustomError): ApiError => {
  const errors = Object.values(err.errors ?? {}).map((el) => el.message);
  const message = `There were validation errors in your input. ${errors.join(
    '. '
  )}. Please correct them and try again.`;
  return new ApiError(message, 422);
};

const handleDocumentNotFoundError = (): ApiError => {
  return new ApiError(
    'The requested resource could not be found. Please check your input and try again.',
    404
  );
};

const handleStrictModeError = (err: CustomError): ApiError => {
  const message = `Field "${err.path}" is not allowed under strict schema rules. Please check your data and try again.`;
  return new ApiError(message, 400);
};

const handleMissingSchemaError = (err: CustomError): ApiError => {
  const message = `The schema for "${err.message}" is missing. Please ensure all schemas are registered correctly.`;
  return new ApiError(message, 500);
};

const handleDisconnectedError = (): ApiError => {
  return new ApiError(
    'Lost connection to the database. Please try again later.',
    503
  );
};

const handleInvalidTokenError = (): ApiError => {
  return new ApiError(
    'Your session is invalid or has been tampered with. Please log in again to continue.',
    401
  );
};

const handleExpiredTokenError = (): ApiError => {
  return new ApiError(
    'Your session has expired. Please log in again to continue.',
    401
  );
};

const handleInactiveTokenError = (): ApiError => {
  return new ApiError(
    'This token is not yet active. Please check the token activation time and try again.',
    401
  );
};

const sendError = (err: CustomError, res: Response, isDev: boolean): void => {
  const statusCode = err.statusCode ?? 500;
  const status = err.status ?? 'error';

  if (isDev) {
    res.status(statusCode).json({
      status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    if (err.isOperational) {
      res.status(statusCode).json({
        status,
        message: err.message,
      });
    } else {
      res.status(500).json({
        status: 'error',
        message:
          'Something went very wrong! Our team has been notified, and we are working to fix this issue.',
      });
    }
  }
};

const globalErrorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  err.statusCode = err.statusCode ?? 500;
  err.status = err.status ?? 'error';

  const isDev = EnvConfig.NODE_ENV === 'development';

  if (err.name === 'CastError') {
    err = handleInvalidFieldError(err);
  } else if (err.name === 'ValidationError') {
    err = handleInputValidationError(err);
  } else if (err.name === 'DocumentNotFoundError') {
    err = handleDocumentNotFoundError();
  } else if (err.name === 'StrictModeError') {
    err = handleStrictModeError(err);
  } else if (err.name === 'MissingSchemaError') {
    err = handleMissingSchemaError(err);
  } else if (err.name === 'DisconnectedError') {
    err = handleDisconnectedError();
  } else if (err.name === 'JsonWebTokenError') {
    err = handleInvalidTokenError();
  } else if (err.name === 'TokenExpiredError') {
    err = handleExpiredTokenError();
  } else if (err.name === 'NotBeforeError') {
    err = handleInactiveTokenError();
  } else if (err.code === 11000) {
    err = handleDuplicateValueError(err);
  }

  sendError(err, res, isDev);
};

export default globalErrorHandler;
