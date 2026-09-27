const requiredProductionKeys = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'SESSION_SECRET'];

function warnAboutConfiguration(config, services) {
  if (!config.isProduction) return;
  const missing = requiredProductionKeys.filter(key => !process.env[key]);
  if (missing.length) console.warn(`Configuration warning: missing ${missing.join(', ')}. Configure these in cPanel, then restart the application.`);
  if (config.sessionSecret && config.sessionSecret.length < 32) console.warn('Configuration warning: SESSION_SECRET should contain at least 32 characters.');
  if (!services.push.enabled) console.warn('Configuration warning: push notifications are disabled. Configure ONESIGNAL_APP_ID and ONESIGNAL_API_KEY, then restart the application.');
}

module.exports = { warnAboutConfiguration };
