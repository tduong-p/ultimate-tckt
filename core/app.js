const logger = require('./src/logger');

(async () => {
  try {
    await require('./src/server').start();
  } catch (error) {
    logger.error('Application failed during startup.', error);
    console.error(error);
    process.exit(1);
  }
})();
