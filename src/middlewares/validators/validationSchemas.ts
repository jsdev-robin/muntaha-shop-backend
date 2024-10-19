import { check, ValidationChain } from 'express-validator';

const signupSchema: ValidationChain[] = [
  check('fname')
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 32 })
    .withMessage('Last name should be between 2 and 32 characters'),
  check('lname')
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 32 })
    .withMessage('Last name should be between 2 and 32 characters'),
  check('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address.'),
  check('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{8,}$/)
    .withMessage(
      'Password must include at least one uppercase letter, one lowercase letter, one digit, one special character, and be at least 8 characters long.'
    ),
  check('passwordConfirm')
    .notEmpty()
    .withMessage('Please confirm your password')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match.'),
];

const activationSchema: ValidationChain[] = [
  check('otp')
    .notEmpty()
    .withMessage('Verification code is required. Please enter it to continue.'),
  check('activationToken')
    .notEmpty()
    .withMessage(
      'Something went wrong. Please refresh the page or try again in a few moments.'
    ),
];

const SigninSchema: ValidationChain[] = [
  check('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address.'),

  check('password').notEmpty().withMessage('Password is required'),
];

const validationMiddleware = {
  signupSchema,
  activationSchema,
  SigninSchema,
};

export default validationMiddleware;
