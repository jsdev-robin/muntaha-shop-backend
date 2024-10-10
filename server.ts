import { app } from './app';
import EnvConfig from './src/config/envConfig';

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

const server = app.listen(EnvConfig.PORT, () => {
  console.log(
    `App is running on port ${EnvConfig.PORT} in ${EnvConfig.NODE_ENV} mode.`
  );
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});
