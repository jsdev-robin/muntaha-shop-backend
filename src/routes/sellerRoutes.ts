import express from 'express';
import { rateLimit } from 'express-rate-limit';
import sellerAuthController from '../controllers/sellerAuthController';
import validationMiddleware from '../middlewares/validators/validationSchemas';
import { runSchema } from '../middlewares/validators/runSchema';
const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  // store: ... , // Redis, Memcached, etc. See below.
});

router.post(
  '/signup',
  limiter,
  validationMiddleware.signupSchema,
  runSchema,
  sellerAuthController.signup
);

router.post(
  '/activation',
  limiter,
  validationMiddleware.activationSchema,
  runSchema,
  sellerAuthController.activation
);

router.post(
  '/signin',
  limiter,
  validationMiddleware.SigninSchema,
  runSchema,
  sellerAuthController.signin
);

router.post(
  '/logout',
  sellerAuthController.isAuthenticated,
  sellerAuthController.restrictTo('seller'),
  sellerAuthController.logout
);

router.get(
  '/me',
  sellerAuthController.isAuthenticated,
  sellerAuthController.updateAccessToken,
  sellerAuthController.restrictTo('seller'),
  sellerAuthController.getUserInfo
);

export default router;
