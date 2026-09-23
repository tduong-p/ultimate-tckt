require('dotenv').config();

const packageInfo = require('../../package.json');

const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 3000);
const db = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'seee_app',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'seee_activity_hub',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10
};
const appBaseUrl = String(process.env.APP_BASE_URL || `http://localhost:${port}`).replace(/\/$/, '');
const microsoftSso = {
  tenant: process.env.AZURE_TENANT || 'hust.edu.vn',
  clientId: process.env.AZURE_CLIENT_ID || '',
  clientSecret: process.env.AZURE_CLIENT_SECRET || '',
  redirectUri: process.env.AZURE_REDIRECT_URI || `${appBaseUrl}/auth/microsoft/callback`,
  allowedDomain: process.env.AZURE_ALLOWED_DOMAIN || 'hust.edu.vn'
};

module.exports = {
  packageInfo,
  port,
  isProduction,
  db,
  microsoftSso,
  hasConfiguredDatabase: ['DB_NAME', 'DB_USER', 'DB_PASSWORD'].every(key => Boolean(process.env[key])),
  sessionSecret: process.env.SESSION_SECRET || null
};
