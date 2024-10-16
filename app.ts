import express, { Application, NextFunction, Request, Response } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import session from 'express-session';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import EnvConfig from './src/config/envConfig';
import ApiError from './src/middlewares/error/ApiError';
import globalErrorHandler from './src/middlewares/error/globalError';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app: Application = express();

// Set security-related HTTP headers
app.use(helmet());

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
    origin: EnvConfig.ISPRODUCTION
      ? 'https://mun-shop-frontend.vercel.app'
      : 'http://localhost:3000',
    credentials: true,
  })
);

// Session management with a secure store
app.use(
  session({
    secret: process.env.SESSION_SECRET ?? 'your-default-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: EnvConfig.ISPRODUCTION,
    },
  })
);

// Sample route
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: true,
    message: 'API is working well!',
  });
});

// Handle 404 errors
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  next(new ApiError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware
app.use(globalErrorHandler);

// Export the app
export default app;
