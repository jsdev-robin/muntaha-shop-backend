import express, { Application, NextFunction, Request, Response } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import session from 'express-session';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

import EnvConfig from './src/config/envConfig';
import ApiError from './src/middlewares/error/ApiError';
import globalErrorHandler from './src/middlewares/error/globalError';
import sellerRoute from './src/routes/sellerRoutes';
import HttpStatusCode from './src/utils/httpStatusCode';
import Status from './src/utils/status';

const app: Application = express();

// Set security-related HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Proxy middleware
app.set('trust proxy', 1);

// Configure Cross-Origin Resource Sharing (CORS)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Serving static files
app.use(express.static(path.join(__dirname, './src/views')));

// Parse request bodies
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Parse cookies
app.use(cookieParser());

// Apply the rate limiting middleware to all requests.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (request: Request, response: Response, next: NextFunction) => {
    next(
      new ApiError(
        `Too many requests, please try again later.`,
        HttpStatusCode.TOO_MANY_REQUESTS
      )
    );
  },
});

app.use(limiter);

// Session management with a secure store
app.use(
  session({
    secret: 'I love her',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: EnvConfig.ISPRODUCTION,
      sameSite: 'none',
    },
  })
);

// Sample route
app.get('/', (req: Request, res: Response) => {
  res.status(HttpStatusCode.OK).json({
    status: Status.SUCCESS,
    message: 'API is working well!',
  });
});

// Global route
app.use('/api/v1/seller', sellerRoute);

// Handle 404 errors
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  next(
    new ApiError(
      `Can't find ${req.originalUrl} on this server!`,
      HttpStatusCode.NOT_FOUND
    )
  );
});

// Global error handling middleware
app.use(globalErrorHandler);

// Export the app
export default app;
