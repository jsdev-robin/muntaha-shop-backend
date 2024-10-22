import { Model } from 'mongoose';

import Utils from '../Utils';
import {
  ISellerActivationRequest,
  ISellerSigninRequest,
  ISellerSignupRequest,
  Role,
} from './type';
import { NextFunction, Request, Response } from 'express';
import { ISeller } from '../../models/seller/type';
import ApiError from '../../middlewares/error/ApiError';
import HttpStatusCode from '../../utils/httpStatusCode';
import EnvConfig from '../../config/envConfig';
import SendEmail from '../../utils/SendEmail';
import Status from '../../utils/status';
import { EncryptedData } from '../../security/cryptoService';
import {
  accessTokenOptions,
  refreshTokenOptions,
} from '../../utils/cookieOptions';
import redisClient from '../../config/ioredis';

class SellerAuthService<T extends ISeller> extends Utils {
  private readonly Model: Model<T>;

  constructor(Model: Model<T>) {
    super();
    this.Model = Model;
  }

  async sessionToken(
    user: T,
    statusCode: number,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Remove the user's password from the user object before sending the response for security reasons.
    user.password = undefined;

    // Generate an access and  a refresh for the authenticated user.
    const accessToken = user?.signAccessToken();
    const refreshToken = user?.signRefreshToken();

    // Set cookies for access and refresh tokens
    res.cookie('seller_access_token', accessToken, {
      httpOnly: true,
      secure: true, // Secure over HTTPS only
      sameSite: 'none', // Allows cross-site cookies
      // domain: '.your-heroku-domain.com', // Server's domain
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
    res.cookie('seller_refresh_token', refreshToken, refreshTokenOptions);

    // Store the user session data in Redis with a unique key derived from the user's ID.
    await redisClient.set(this.redisKey(user?._id), JSON.stringify(user));

    // Send a JSON response back to the client with the status, a welcome message, user information, and the access token.
    res.status(statusCode).json({
      success: Status.SUCCESS,
      message: `Welcome back ${user.fname}.`,
      user,
      accessToken,
    });
  }

  restrictTo = (...roles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = req.user as ISeller;
      if (!roles.includes(user?.role)) {
        const error = new ApiError(
          'You do not have permission to perform this action',
          HttpStatusCode.FORBIDDEN
        );
        next(error);
        return;
      }

      next();
    };
  };

  isAuthenticated = this.catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const accessToken: string | undefined = req.cookies?.seller_access_token;

      // Check if access token is provided
      if (!accessToken) {
        const error: ApiError = new ApiError(
          'Please login to access this resource',
          HttpStatusCode.BAD_REQUEST
        );
        next(error);
        return;
      }

      // Verify the access token
      const decoded = Utils.jwtVerifier(
        accessToken,
        EnvConfig.ACCESS_TOKEN
      ) as {
        id: string;
      };

      // Check if token is valid
      if (!decoded) {
        const error: ApiError = new ApiError(
          'Access token is not valid',
          HttpStatusCode.BAD_REQUEST
        );
        next(error);
        return;
      }

      // Find user by ID from decoded token
      const user = await this.Model.findById(decoded.id);

      // Check if user exists
      if (!user) {
        const error: ApiError = new ApiError(
          'Please login to access this resource',
          HttpStatusCode.BAD_REQUEST
        );
        next(error);
        return;
      }

      // Set user in request object
      req.user = user;

      next();
    }
  );

  signup = this.catchAsync(
    async (
      req: ISellerSignupRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { fname, lname, email, password } = req.body;

      // Validate required fields for signup
      if (!fname || !lname || !email || !password) {
        const error: ApiError = new ApiError(
          'Please provide values for all required fields: first name, last name, email, and password.',
          HttpStatusCode.BAD_REQUEST
        );
        next(error);
        return;
      }

      // Check if the email is already registered
      const existingEmail = await this.Model.findOne({ email });
      if (existingEmail) {
        const error: ApiError = new ApiError(
          'Email is already taken. Please use a different email address.',
          HttpStatusCode.BAD_REQUEST
        );
        next(error);
        return;
      }

      // Prepare user object with encrypted password
      const user = {
        fname,
        lname,
        email,
        password: this.encrypt(password, EnvConfig.CRYPTO_SECRET),
      };

      // Generate verification token and OTP for the user and Handle error in generating verification info
      const verificationInfo = this.otpGenerator(
        user,
        EnvConfig.ACTIVATION_SECRET
      );
      if (!verificationInfo) {
        const error: ApiError = new ApiError(
          'There was an error generating the verification code. Please try again later.',
          HttpStatusCode.INTERNAL_SERVER_ERROR
        );
        next(error);
        return;
      }

      // Extract token and OTP from verification info
      const { token, otp } = verificationInfo;

      // Prepare email data for sending verification code
      const emailData = {
        user: {
          name: this.capitalize(user?.fname),
          email: user?.email,
        },
        otp,
      };

      // Send verification email and handle potential errors
      await new SendEmail(emailData)
        .verifyAccount()
        .then(() => {
          res.status(HttpStatusCode.OK).json({
            status: Status.SUCCESS,
            message: 'Verification code sent successfully to your email.',
            token,
          });
        })
        .catch(() => {
          const error = new ApiError(
            'There was an error sending the email. Please try again later!',
            HttpStatusCode.INTERNAL_SERVER_ERROR
          );
          next(error);
        });
    }
  );

  activation = this.catchAsync(
    async (
      req: ISellerActivationRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { activationToken, otp } = req.body;

      // Check if verification code is provided
      if (!otp) {
        const error: ApiError = new ApiError(
          'Please enter the verification code sent to your email to complete the activation process.',
          HttpStatusCode.BAD_REQUEST
        );
        next(error);
        return;
      }

      // Check if activation token is provided
      if (!activationToken) {
        const error: ApiError = new ApiError(
          'It seems your activation link is missing or invalid. Please try again or request a new activation email.',
          HttpStatusCode.BAD_REQUEST
        );
        next(error);
        return;
      }

      // Verify the activation token
      const decoded = Utils.jwtVerifier(
        activationToken,
        EnvConfig.ACTIVATION_SECRET
      ) as {
        payload: {
          fname: string;
          lname: string;
          email: string;
          password: EncryptedData;
        };
        encryptedOtp: EncryptedData;
      };

      // Check if activation token is valid
      if (!decoded) {
        const error: ApiError = new ApiError(
          'Your activation link has expired or is invalid. Please try again or request a new activation email.',
          HttpStatusCode.BAD_REQUEST
        );
        next(error);
        return;
      }

      // Check if provided OTP matches the decoded OTP
      const encryptedOtp = this.decrypt(
        decoded.encryptedOtp,
        EnvConfig.CRYPTO_SECRET
      );

      const decodedOTP = +encryptedOtp;
      const providedOTP = +otp;

      if (decodedOTP !== providedOTP) {
        const error: ApiError = new ApiError(
          'The OTP you entered is incorrect. Please double-check the OTP and try again.',
          HttpStatusCode.BAD_REQUEST
        );
        next(error);
        return;
      }
      // Extract user details from decoded payload
      const { fname, lname, email, password } = decoded.payload;

      // Check if email is already registered
      const existingEmail = await this.Model.findOne({ email });
      if (existingEmail) {
        const error = new ApiError(
          'Email is already registered. Please use a different email address.',
          HttpStatusCode.BAD_REQUEST
        );
        next(error);
        return;
      }

      // Create a new user with verified status
      const newUser = await this.Model.create({
        fname: this.capitalize(fname),
        lname: this.capitalize(lname),
        email,
        password: this.decrypt(password, EnvConfig.CRYPTO_SECRET),
        isVerified: true,
      });

      // Send success responses
      res.status(HttpStatusCode.CREATED).json({
        status: Status.SUCCESS,
        newUser,
        message: `Congratulations, ${this.capitalize(
          fname
        )}! Your account has been successfully activated.`,
      });
    }
  );

  signin = this.catchAsync(
    async (
      req: ISellerSigninRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { email, password } = req.body;

      // Check if email and password are provided
      if (!email || !password) {
        const error: ApiError = new ApiError(
          'Please provide your email and password.',
          HttpStatusCode.BAD_REQUEST
        );
        next(error);
        return;
      }

      // Find user by email
      const user = await this.Model.findOne({ email }).select('+password');

      if (!user) {
        const error: ApiError = new ApiError(
          'Incorrect email or password. Please check your credentials and try again.',
          HttpStatusCode.UNAUTHORIZED
        );
        next(error);
        return;
      }

      // Check if provided password is correct
      const isPasswordCorrect = await user.correctPassword(password);
      if (!isPasswordCorrect) {
        const error: ApiError = new ApiError(
          'Incorrect email or password. Please check your credentials and try again.',
          HttpStatusCode.UNAUTHORIZED
        );
        next(error);
        return;
      }

      await this.sessionToken(user, HttpStatusCode.OK, res, next);
    }
  );

  logout = this.catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      // Clear access and refresh tokens by setting their maxAge to 1ms
      res.cookie('seller_access_token', '', { maxAge: 1 });
      res.cookie('seller_refresh_token', '', { maxAge: 1 });

      const user = req.user as T;

      if (!user) {
        const error: ApiError = new ApiError(
          'Please login to access this resource',
          HttpStatusCode.BAD_REQUEST
        );
        next(error);
        return;
      }

      // Delete user session from Redis
      await redisClient.del(this.redisKey(user?._id));

      // Send successful logout response
      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'You have been successfully logged out.',
      });
    }
  );

  updateAccessToken = this.catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      // Check if refresh token exists in cookies
      const refreshTokenCookie: string = req.cookies?.seller_refresh_token;
      if (!refreshTokenCookie) {
        const error: ApiError = new ApiError(
          'Refresh token not found. Please log in to access this resource.',
          HttpStatusCode.BAD_REQUEST
        );
        next(error);
        return;
      }

      // Verify the refresh token
      const decoded = Utils.jwtVerifier(
        refreshTokenCookie,
        EnvConfig.REFRESH_TOKEN
      ) as {
        id: string;
      };

      if (!decoded) {
        const error: ApiError = new ApiError(
          'Your refresh token is invalid or has expired. Please log in again to obtain a new token.',
          HttpStatusCode.BAD_REQUEST
        );
        next(error);
        return;
      }

      // Retrieve user session from Redis
      const session: string | null = await redisClient.get(
        this.redisKey(decoded.id)
      );

      if (!session) {
        const error = new ApiError(
          'User session not found. Please log in again to restore your session.',
          HttpStatusCode.BAD_REQUEST
        );
        next(error);
        return;
      }

      // Parse user data from the session
      const user = JSON.parse(session);
      if (!user) {
        const error: ApiError = new ApiError(
          'Unable to retrieve user data. Please log in again to access your account.',
          HttpStatusCode.BAD_REQUEST
        );
        next(error);
        return;
      }

      // Generate new access and refresh tokens
      const accessToken = Utils.jwtCreator(
        { id: user._id },
        EnvConfig.ACCESS_TOKEN ?? '',
        EnvConfig.ACCESS_TOKEN_EXPIRE ?? '5m'
      );

      const refreshToken = Utils.jwtCreator(
        { id: user._id },
        EnvConfig.REFRESH_TOKEN ?? '',
        EnvConfig.REFRESH_TOKEN_EXPIRE ?? '3d'
      );

      // Set user data in the request object
      req.user = user;

      // Set cookies for access and refresh tokens
      res.cookie('seller_access_token', accessToken, accessTokenOptions);
      res.cookie('seller_refresh_token', refreshToken, accessTokenOptions);

      // Store user session in Redis with a 7-day expiration
      await redisClient.set(this.redisKey(user._id), JSON.stringify(user), {
        EX: 604800, // 7 days
        NX: true,
      });

      // Proceed to the next middleware
      next();
    }
  );

  getUserInfo = this.catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      // Get the user from the request object
      const user = req.user as T;

      // Check if the user is logged in
      if (!user) {
        const error: ApiError = new ApiError(
          'You need to be logged in to access your account information. Please log in and try again.',
          HttpStatusCode.BAD_REQUEST
        );
        next(error);
        return;
      }

      // Check if the user ID is available
      if (!user?._id) {
        const error: ApiError = new ApiError(
          'It seems there is an issue with your session. Please sign in again to continue.',
          HttpStatusCode.BAD_REQUEST
        );
        next(error);
        return;
      }

      // Declare a variable to hold the user session data retrieved from Redis or the database
      let sessionUser;

      // Check if user data exists in Redis cache
      const redisUser = await redisClient.get(this.redisKey(user._id));

      // If user data exists in Redis cache, parse and use it
      if (redisUser) {
        sessionUser = JSON.parse(redisUser);
      } else {
        // If user data doesn't exist in Redis cache, fetch from MongoDB
        sessionUser = await this.Model.findById(user._id);

        // If user doesn't exist in MongoDB, return an error
        if (!user) {
          const error: ApiError = new ApiError(
            'No user found. Please log in again to access your account.',
            HttpStatusCode.BAD_REQUEST
          );
          next(error);
          return;
        }

        // Store user data in Redis cache with expiration set to 7 days
        await redisClient.set(
          this.redisKey(user._id),
          JSON.stringify(sessionUser),
          {
            EX: 7 * 24 * 60 * 60,
            NX: true,
          }
        );
      }

      // Send a success response with the user info
      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        user: sessionUser,
        message:
          'Here is your account information. If anything looks incorrect, feel free to update your profile!',
      });
    }
  );
}

export default SellerAuthService;
