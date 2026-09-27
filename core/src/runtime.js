const { createApplication } = require('./app');
const logger = require('./logger');
const push = require('./push');
const { startDeadlineNotificationScheduler } = require('./services/deadline-notifications');
const { migrateDatabase } = require('./config/migrate');

async function start(options = {}) {
  const application = createApplication(options);
  if (options.autoMigrate !== false && application.config.hasConfiguredDatabase) {
    try {
      await migrateDatabase(application.db, { logger });
    } catch (err) {
      logger.error('Auto-migration failed during startup', err);
      console.error('Auto-migration failed during startup:', err);
    }
  }
  const port = options.port ?? application.config.port;
  const server = application.app.listen(port, () => {
    logger.info(`TCKT Activity Hub v${application.config.packageInfo.version} started on port ${port}.`);
    console.log(`TCKT Activity Hub running on port ${port}`);
  });
  const mailer = require('./mailer');
  const stopDeadlineNotifications = startDeadlineNotificationScheduler({ db: application.db, push, mailer, logger });

  server.on('error', error => {
    logger.error(`HTTP server could not start on port ${port}.`, error);
    console.error(error);
  });

  const shutdown = signal => {
    logger.info(`Application received ${signal}; shutting down.`);
    stopDeadlineNotifications();
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
