import { RequestHandler, Request, Response, NextFunction } from 'express';
import crypto, { createCipheriv, createDecipheriv } from 'crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';
import EnvConfig from '../config/envConfig';
import { ObjectId } from 'mongoose';

export interface EncryptedData {
  iv: string;
  encryptedData: string;
}

export interface OtpGeneratorOptions {
  expiresIn?: string | number;
  otpLength?: number;
}

export interface OtpGeneratorResult {
  token: string;
  otp: number;
}

// Ensure key is exactly 32 bytes long for AES-256 encryption
function ensureKeyLength(key: string): Buffer {
  const keyBuffer = Buffer.from(key, 'utf-8');
  if (keyBuffer.length < 32) {
    // Pad the key if it's shorter than 32 bytes
    const paddedKey = Buffer.alloc(32);
    keyBuffer.copy(paddedKey);
    return paddedKey;
  }
  // Truncate the key if it's longer than 32 bytes
  if (keyBuffer.length > 32) {
    return keyBuffer.slice(0, 32);
  }
  return keyBuffer;
}

class Utils {
  // Wrapper for asynchronous route handlers to catch and forward errors
  protected catchAsync = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
  ): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction): void => {
      fn(req, res, next).catch(next);
    };
  };

  // Encrypts the given text using AES-256-CBC
  protected encrypt = (text: any, key: string): EncryptedData => {
    const iv = Buffer.from(EnvConfig.BYTE_KEY_16, 'utf-8').slice(0, 16);
    const cipher = createCipheriv('aes-256-cbc', ensureKeyLength(key), iv);
    let encrypted = cipher.update(JSON.stringify(text), 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return { iv: iv.toString('hex'), encryptedData: encrypted };
  };

  // Decrypts data encrypted using AES-256-CBC
  protected decrypt = (encryptedData: EncryptedData, key: string): any => {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', ensureKeyLength(key), iv);
    let decrypted = decipher.update(
      encryptedData.encryptedData,
      'hex',
      'utf-8'
    );
    decrypted += decipher.final('utf-8');
    return JSON.parse(decrypted);
  };

  // Generates an OTP and JWT token with a specific payload and secret
  protected otpGenerator = (
    payload: any,
    secret: string,
    options: OtpGeneratorOptions = {}
  ): OtpGeneratorResult => {
    const { expiresIn = '10m', otpLength = 6 } = options;

    // Validate OTP length constraints (between 6 and 10 digits)
    if (otpLength < 6 || otpLength > 10) {
      throw new Error('OTP length must be between 6 and 10 digits.');
    }

    // Generate a random OTP within the specified range
    const otpMin = Math.pow(10, otpLength - 1);
    const otpMax = Math.pow(10, otpLength) - 1;

    const otp = crypto.randomInt(otpMin, otpMax);
    const encryptedOtp = this.encrypt(otp, EnvConfig.CRYPTO_SECRET ?? '');

    // Create a JWT token with the payload and encrypted OTP
    const token = jwt.sign({ payload, encryptedOtp }, secret, {
      expiresIn,
    });

    return { token, otp };
  };

  // Capitalizes the first letter of a given string
  protected capitalize = (text: string): string => {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
  };

  // Convert data into redis key
  protected redisKey(
    key: string | Buffer | number | undefined | ObjectId | any
  ): string {
    const validId: string = key?.toString() ?? '';
    return validId;
  }

  // Verifies a JWT token and returns the payload
  static jwtVerifier = (token: string, secret: string): JwtPayload | string => {
    return jwt.verify(token, secret);
  };

  // Creates a new JWT token with a given payload, secret, and expiration time
  static jwtCreator = (
    payload: JwtPayload,
    secret: string,
    expiresIn: string = '1h'
  ): string => {
    return jwt.sign(payload, secret, { expiresIn });
  };
}

export default Utils;
