import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

interface ProcessEnv {
  PORT?: string;
  NODE_ENV?: 'development' | 'production';
  DATABASE_LOCAL?: string;
  DATABASE_ONLINE?: string;
  DATABASE_PASSWORD_ONLINE?: string;
  ACTIVATION_SECRET?: string;
  CRYPTO_SECRET?: string;
  EMAIL_USERNAME?: string;
  EMAIL_PASSWORD?: string;
  EMAIL_HOST?: string;
  EMAIL_PORT?: string;
  EMAIL_FROM?: string;
  ACCESS_TOKEN?: string;
  REFRESH_TOKEN?: string;
  ACCESS_TOKEN_EXPIRE?: string;
  REFRESH_TOKEN_EXPIRE?: string;
  REDIS_URL?: string;
}

function validateEnvVariables(env: ProcessEnv): void {
  const requiredVars: Array<keyof ProcessEnv> = [
    'PORT',
    'NODE_ENV',
    'DATABASE_LOCAL',
    'DATABASE_ONLINE',
    'DATABASE_PASSWORD_ONLINE',
    'ACTIVATION_SECRET',
    'CRYPTO_SECRET',
    'EMAIL_USERNAME',
    'EMAIL_PASSWORD',
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_FROM',
    'ACCESS_TOKEN',
    'REFRESH_TOKEN',
    'ACCESS_TOKEN_EXPIRE',
    'REFRESH_TOKEN_EXPIRE',
    'REDIS_URL',
  ];

  const missingVars = requiredVars.filter(
    (key) => env[key] === undefined || env[key] === ''
  );

  if (missingVars.length > 0) {
    console.error(`Missing environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }
}

const env = process.env as unknown as ProcessEnv;
validateEnvVariables(env);

const {
  PORT = '3000',
  NODE_ENV = 'development',
  DATABASE_LOCAL = '',
  DATABASE_ONLINE = '',
  DATABASE_PASSWORD_ONLINE = '',
  ACTIVATION_SECRET = '',
  CRYPTO_SECRET = '',
  EMAIL_USERNAME = '',
  EMAIL_PASSWORD = '',
  EMAIL_HOST = '',
  EMAIL_PORT = '',
  EMAIL_FROM = '',
  ACCESS_TOKEN = '',
  REFRESH_TOKEN = '',
  ACCESS_TOKEN_EXPIRE = '',
  REFRESH_TOKEN_EXPIRE = '',
  REDIS_URL = '',
} = env;

const ISPRODUCTION = NODE_ENV === 'production';
const DB = ISPRODUCTION
  ? DATABASE_ONLINE.replace('<db_password>', DATABASE_PASSWORD_ONLINE)
  : DATABASE_LOCAL;

const EnvConfig = {
  ISPRODUCTION,
  PORT,
  NODE_ENV,
  DB,
  ACTIVATION_SECRET,
  CRYPTO_SECRET,
  EMAIL_USERNAME,
  EMAIL_PASSWORD,
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_FROM,
  ACCESS_TOKEN,
  REFRESH_TOKEN,
  ACCESS_TOKEN_EXPIRE,
  REFRESH_TOKEN_EXPIRE,
  REDIS_URL,
};

export default EnvConfig;
