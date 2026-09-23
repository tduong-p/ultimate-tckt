const crypto = require('crypto');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

function createSessionMiddleware(config) {
  const options = {
    name: 'tckt.sid',
    secret: config.sessionSecret || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProduction,
      maxAge: 43200000
    }
  };
  if (config.hasConfiguredDatabase) options.store = new MySQLStore(config.db);
  return session(options);
}

module.exports = { createSessionMiddleware };
