const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const config = require('./config/environment');
const { createDatabase } = require('./config/database');
const { createSessionMiddleware } = require('./config/session');
const { warnAboutConfiguration } = require('./config/validate');
const { auth, admin, manager, devops, isLeadership, isExecutive, managerOrEventLead } = require('./middleware/auth');
const { createErrorHandler } = require('./middleware/errors');
const { taskUpload, attachmentKinds, allowedExtensions } = require('./middleware/uploads');
const { createAccessPolicies } = require('./policies/access');
const { asyncRoute, validHttpUrl, one, ids } = require('./routes/utils');
const { registerRoutes } = require('./routes');
const logger = require('./logger');
const push = require('./push');
const emailEvents = require('./services/email-events');

function createApplication(options = {}) {
  const runtimeConfig = options.config || config;
  const db = options.db || createDatabase(runtimeConfig.db);
  const app = express();
  const attachmentRoot = path.join(__dirname, '..', 'storage', 'task-attachments');
  fs.mkdirSync(attachmentRoot, { recursive: true });

  warnAboutConfiguration(runtimeConfig, { push });
  app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.onesignal.com", "https://*.onesignal.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://unpkg.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "https://cdn.onesignal.com", "https://*.onesignal.com", "https://onesignal.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: null
      }
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'sameorigin' }
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(createSessionMiddleware(runtimeConfig));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  const policies = createAccessPolicies(db, isLeadership, isExecutive);
  const context = {
    db, auth, admin, manager, devops, isLeadership, isExecutive, asyncRoute, validHttpUrl, one, ids,
    ...policies,
    managerOrEventLead: managerOrEventLead(policies.canManageActivity),
    bcrypt, ExcelJS, packageInfo: runtimeConfig.packageInfo, microsoftSso: runtimeConfig.microsoftSso, logger, push, emailEvents,
    taskUpload, attachmentKinds, allowedExtensions, attachmentRoot, path, fs, crypto
  };
  registerRoutes(app, context);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
  app.use(createErrorHandler(logger));

  return { app, db, config: runtimeConfig };
}

module.exports = { createApplication };
