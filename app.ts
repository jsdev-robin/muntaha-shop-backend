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
import sellerRoute from './src/routes/sellerRoutes';
import { initializePassport, passport } from './src/auth/passport';

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

// Express.js CORS setup
// app.use((req, res, next) => {
//   res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000'); // Replace with your frontend domain
//   res.setHeader('Access-Control-Allow-Credentials', 'true'); // Allow credentials
//   res.setHeader(
//     'Access-Control-Allow-Methods',
//     'GET, POST, OPTIONS, PUT, PATCH, DELETE'
//   );
//   res.setHeader(
//     'Access-Control-Allow-Headers',
//     'X-Requested-With,content-type'
//   );
//   next();
// });

// Configure Cross-Origin Resource Sharing (CORS)
app.use(
  cors({
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    origin: EnvConfig.ISPRODUCTION
      ? 'http://localhost:3000'
      : 'http://localhost:3000',
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

// Serialize user into the session
passport.serializeUser((user: any, done: any) => {
  done(null, user);
});

// Deserialize user from the session
passport.deserializeUser((user: any, done: any) => {
  done(null, user);
});

// Initialize Passport
initializePassport();
app.use(passport.session());
app.use(passport.initialize());

// Global route
app.use('/api/v1/seller', sellerRoute);

// Handle 404 errors
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  next(new ApiError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware
app.use(globalErrorHandler);

// Export the app
export default app;
