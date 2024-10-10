import express, { Application, NextFunction, Request, Response } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import session from 'express-session';
import cors from 'cors';
import path from 'path';

import EnvConfig from './src/config/envConfig';
import ApiError from './src/middlewares/error/ApiError';
import globalErrorHandler from './src/middlewares/error/globalError';

export const app: Application = express();

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serving static files
app.use(express.static(path.join(__dirname, './src/views')));

// Parse request bodies
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Parse cookies
app.use(cookieParser());

// Configure Cross-Origin Resource Sharing (CORS)
app.use(
  cors({
    origin: [
      EnvConfig.ISPRODUCTION
        ? 'https://mun-shop-frontend.vercel.app'
        : 'http://localhost:3000',
      'http://localhost:3000',
    ],
    credentials: true,
  })
);

app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
  })
);

app.get('/', (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    status: true,
    message: 'Api working well!',
  });
});

// Global Error
app.all('*', (req, res, next) => {
  next(new ApiError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);
