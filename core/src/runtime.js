const { createApplication } = require('./app');
const logger = require('./logger');
const push = require('./push');
const { startDeadlineNotificationScheduler } = require('./services/deadline-notifications');
const { migrateDatabase } = require('./config/migrate');

async function migrateOnStartup(application, options = {}) {
  if (options.autoMigrate === false || !application.config.hasConfiguredDatabase) return;
  const migrate = options.migrateDatabase || migrateDatabase;
  try {
    await migrate(application.db, { logger });
  } catch (err) {
    // Chạy tiếp trên schema dở dang thì mọi request đăng nhập đều 500 (unit-context đọc bảng mới).
    // Thoát để container khởi động lại khi DB sẵn sàng.
    logger.error('Auto-migration failed during startup', err);
    throw err;
  }
}

async function start(options = {}) {
  const application = createApplication(options);
  await migrateOnStartup(application, options);
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

module.exports = { start, migrateOnStartup };
