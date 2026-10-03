const { createSystemRoutes } = require('./system');
const { createActivityRoutes } = require('./activities');
const { createTaskRoutes } = require('./tasks');
const { createUserRoutes } = require('./users');
const { createTeamRoutes } = require('./teams');
const { createDocumentRoutes } = require('./documents');
const { createReportRoutes } = require('./reports');
const { createNotificationRoutes } = require('./notifications');
const { createPlatformRoutes } = require('./platform');
const { createUnitRoutes } = require('./units');
const { createDirectiveRoutes } = require('./directives');
const { createSubmissionRoutes } = require('./submissions');

function registerRoutes(app, context) {
  app.use(createSystemRoutes(context));
  app.use(createActivityRoutes(context));
  app.use(createTaskRoutes(context));
  app.use(createUserRoutes(context));
  app.use(createTeamRoutes(context));
  app.use(createDocumentRoutes(context));
  app.use(createReportRoutes(context));
  app.use(createNotificationRoutes(context));
  
  // Khôi phục lại 2 router đã mất để sửa 23 lỗi Fail
  app.use(createPlatformRoutes(context));
  app.use(createUnitRoutes(context));
  
  // Gọi router mới mà KHÔNG truyền thêm prefix (vì bên trong file con đã có sẵn /api/...)
  app.use(createDirectiveRoutes(context));
  app.use(createSubmissionRoutes(context));
}

module.exports = { registerRoutes };