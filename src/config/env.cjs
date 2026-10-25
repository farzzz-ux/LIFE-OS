/**
 * LIFE OS — Central Environment & Configuration Manager
 * Handles secret validation and failsafe production checks.
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = parseInt(process.env.PORT, 10) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'lifeos-cloud-sync-super-secure-production-jwt-token-key-2026';
const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'lifeos.db');
const DATABASE_URL = process.env.DATABASE_URL || '';
const BACKUP_RETENTION_COUNT = parseInt(process.env.BACKUP_RETENTION_COUNT, 10) || 7;
const AUTH_RATE_LIMIT_MAX = parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 100;
const API_RATE_LIMIT_MAX = parseInt(process.env.API_RATE_LIMIT_MAX, 10) || 1000;

// Security Failsafe: Prevent startup if default insecure secrets are detected in production
const INSECURE_DEFAULT_SECRETS = [
  'secret',
  'jwt_secret',
  'changeme',
  '123456',
  'password',
  'life-os-cloud-sync-jwt-secret-key-2026'
];

if (NODE_ENV === 'production') {
  if (!JWT_SECRET || JWT_SECRET.length < 32 || INSECURE_DEFAULT_SECRETS.includes(JWT_SECRET.toLowerCase())) {
    console.error('================================================================================');
    console.error('FATAL SECURITY ERROR: Insecure or default JWT_SECRET detected in production!');
    console.error('Please configure a strong, random JWT_SECRET with at least 32 characters in .env');
    console.error('================================================================================');
    process.exit(1);
  }
}

module.exports = {
  NODE_ENV,
  PORT,
  JWT_SECRET,
  DB_PATH,
  DATABASE_URL,
  BACKUP_RETENTION_COUNT,
  AUTH_RATE_LIMIT_MAX,
  API_RATE_LIMIT_MAX
};
