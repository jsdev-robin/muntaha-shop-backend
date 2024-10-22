import EnvConfig from '../config/envConfig';

/**
 * Expiration time for access token in minutes.
 */
const accessTokenExpires: number = parseInt(
  EnvConfig.ACCESS_TOKEN_EXPIRE ?? '5',
  10
);

/**
 * Expiration time for refresh token in days.
 */
const refreshTokenExpires: number = parseInt(
  EnvConfig.REFRESH_TOKEN_EXPIRE ?? '3',
  10
);

/**
 * Checks if the environment is in production mode.
 */

/**
 * Common options for cookie settings.
 */
const commonOptions = {
  httpOnly: true,
  sameSite: EnvConfig.ISPRODUCTION ? ('None' as const) : ('lax' as const),
  secure: EnvConfig.ISPRODUCTION,
};

/**
 * Options for access token cookie.
 */
export const accessTokenOptions = {
  ...commonOptions,
  expires: new Date(Date.now() + accessTokenExpires * 60 * 1000), // 5 minutes
  maxAge: accessTokenExpires * 60 * 1000,
};

/**
 * Options for refresh token cookie.
 */
export const refreshTokenOptions = {
  ...commonOptions,
  expires: new Date(Date.now() + refreshTokenExpires * 24 * 60 * 60 * 1000), // 3 days
  maxAge: refreshTokenExpires * 24 * 60 * 60 * 1000,
};
