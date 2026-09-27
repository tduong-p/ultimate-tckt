const { createSystemRoutes } = require('./system');
const { createActivityRoutes } = require('./activities');
const { createTaskRoutes } = require('./tasks');
const { createUserRoutes } = require('./users');
const { createTeamRoutes } = require('./teams');
const { createDocumentRoutes } = require('./documents');
const { createReportRoutes } = require('./reports');
const { createNotificationRoutes } = require('./notifications');

function registerRoutes(app, context) {
  app.use(createSystemRoutes(context));
  app.use(createActivityRoutes(context));
  app.use(createTaskRoutes(context));
  app.use(createUserRoutes(context));
  app.use(createTeamRoutes(context));
  app.use(createDocumentRoutes(context));
  app.use(createReportRoutes(context));
  app.use(createNotificationRoutes(context));
}

module.exports = { registerRoutes };
