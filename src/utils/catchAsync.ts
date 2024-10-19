import { RequestHandler, Request, Response, NextFunction } from 'express';

// Define a higher-order function to catch async errors in route handlers
export const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler => {
  // Return a new request handler that wraps the provided async function
  return (req: Request, res: Response, next: NextFunction): void => {
    // Call the async function and catch any errors, passing them to the next middleware (error handler)
    fn(req, res, next).catch(next);
  };
};
