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
const { createUnitContextMiddleware } = require('./middleware/unit-context');
const { createLegacyGate, LEGACY_PREFIXES } = require('./middleware/legacy-gate');
const { createSettingGuard } = require('./middleware/setting-guard');
const { warnAboutConfiguration } = require('./config/validate');
const { auth, admin, manager, isLeadership, isExecutive, managerOrEventLead, platformAdmin, isPlatformAdmin } = require('./middleware/auth');
const { createErrorHandler } = require('./middleware/errors');
const { taskUpload, attachmentKinds, allowedExtensions } = require('./middleware/uploads');
const { createAccessPolicies } = require('./policies/access');
const { asyncRoute, validHttpUrl, one, ids } = require('./routes/utils');
const { registerRoutes } = require('./routes');
const logger = require('./logger');
const { createNotifier } = require('./notifier');
const { notiSenderFromEnv } = require('./noti-sender');

function createApplication(options = {}) {
  const runtimeConfig = options.config || config;
  const db = options.db || createDatabase(runtimeConfig.db);
  const app = express();
  const attachmentRoot = path.join(__dirname, '..', 'storage', 'task-attachments');
  fs.mkdirSync(attachmentRoot, { recursive: true });

  warnAboutConfiguration(runtimeConfig);
  app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://unpkg.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'"],
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
  app.use(createUnitContextMiddleware(db));
  app.use(LEGACY_PREFIXES, createLegacyGate(db));

  // Test-only route for verifying unit context middleware (not exposed in production)
  if (!runtimeConfig.isProduction) {
    app.get('/test/unit-context', (req, res) => {
      res.json({ unit: req.unit, unitRole: req.unitRole, memberships: req.memberships, actor: req.actor });
    });
    app.get('/test/platform-admin', auth, platformAdmin, (req, res) => {
      res.json({ success: true, message: 'DYC platform admin access confirmed' });
    });
  }

  const audit = require('./services/audit');
  const sender = options.notiSender !== undefined ? options.notiSender : notiSenderFromEnv(process.env);
  const notifier = createNotifier({ logger, sender });
  const policies = createAccessPolicies(db, isLeadership, isExecutive, audit);
  const settingGuard = createSettingGuard(db);
  const context = {
    db, auth, admin, manager, platformAdmin, settingGuard, isLeadership, isExecutive, isPlatformAdmin, asyncRoute, validHttpUrl, one, ids,
    ...policies,
    managerOrEventLead: managerOrEventLead(policies.canManageActivity),
    bcrypt, ExcelJS, packageInfo: runtimeConfig.packageInfo, microsoftSso: runtimeConfig.microsoftSso, logger, notifier,
    taskUpload, attachmentKinds, allowedExtensions, attachmentRoot, path, fs, crypto
  };
  registerRoutes(app, context);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
  app.use(createErrorHandler(logger));

  return { app, db, config: runtimeConfig, notifier };
}

module.exports = { createApplication };
