import express from 'express';
import sellerAuthController from '../controllers/sellerAuthController';
import validationMiddleware from '../middlewares/validators/validationSchemas';
import { runSchema } from '../middlewares/validators/runSchema';
const router = express.Router();

router.post(
  '/signup',
  validationMiddleware.signupSchema,
  runSchema,
  sellerAuthController.signup
);

router.post(
  '/activation',
  validationMiddleware.activationSchema,
  runSchema,
  sellerAuthController.activation
);

router.post(
  '/signin',
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
  sellerAuthController.updateAccessToken,
  sellerAuthController.isAuthenticated,
  sellerAuthController.restrictTo('seller'),
  sellerAuthController.getUserInfo
);

router.get(
  '/seller/update-access-token',
  sellerAuthController.updateAccessToken
);

export default router;
