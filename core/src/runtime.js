const { createApplication } = require('./app');
const logger = require('./logger');
const push = require('./push');
const { startDeadlineNotificationScheduler } = require('./services/deadline-notifications');
const { migrateDatabase } = require('./config/migrate');
const { start: startCronRunner, stopAll: stopCronRunner } = require('./services/cron-runner');
const { ensureDycAdmins } = require('./units/memberships');
const { devopsEmailAllowlist } = require('./middleware/auth');

async function start(options = {}) {
  const application = createApplication(options);
  if (options.autoMigrate !== false && application.config.hasConfiguredDatabase) {
    try {
      await migrateDatabase(application.db, { logger });
    } catch (err) {
      logger.error('Auto-migration failed during startup', err);
      console.error('Auto-migration failed during startup:', err);
    }
    try {
      const granted = await ensureDycAdmins(application.db, devopsEmailAllowlist());
      logger.info(`DYC bootstrap: ${granted} account(s) ensured as dyc_admin.`);
    } catch (err) {
      logger.error('DYC bootstrap failed during startup', err);
    }
  }
  const port = options.port ?? application.config.port;
  const server = application.app.listen(port, () => {
    logger.info(`TCKT Activity Hub v${application.config.packageInfo.version} started on port ${port}.`);
    console.log(`TCKT Activity Hub running on port ${port}`);
  });
  const emailEvents = require('./services/email-events');
  const stopDeadlineNotifications = startDeadlineNotificationScheduler({ db: application.db, push, emailEvents, logger });
  startCronRunner(application.db, logger).catch(err => logger.error('Failed to start cron runner during startup.', err));

  server.on('error', error => {
    logger.error(`HTTP server could not start on port ${port}.`, error);
    console.error(error);
  });

  const shutdown = signal => {
    logger.info(`Application received ${signal}; shutting down.`);
    stopDeadlineNotifications();
    stopCronRunner();
    server.close(() => application.db.end().finally(() => process.exit(0)));
  };
  if (options.handleSignals !== false) {
    process.on('uncaughtException', error => { logger.error('Uncaught exception terminated the application.', error); console.error(error); process.exit(1); });
    process.on('unhandledRejection', reason => { logger.error('Unhandled promise rejection.', reason); console.error(reason); });
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
  }

  return { ...application, server, port, shutdown };
}

module.exports = { start };
