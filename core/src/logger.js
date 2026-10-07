const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '..', 'log.md');

function clean(value) {
  const text = value instanceof Error
    ? `${value.name}: ${value.message}\n${value.stack || ''}`
    : typeof value === 'string' ? value : JSON.stringify(value);
  return String(text || 'Unknown error')
    .replace(/(password|secret|token)(["'\s:=]+)[^\s,"']+/gi, '$1$2[REDACTED]')
    .trim();
}

function write(level, message, details) {
  const timestamp = new Date().toISOString();
  const extra = details ? `\n\n\`\`\`text\n${clean(details)}\n\`\`\`` : '';
  const entry = `\n## ${timestamp} — ${level.toUpperCase()}\n\n${clean(message)}${extra}\n`;
  try {
    fs.appendFileSync(logPath, entry, { encoding: 'utf8', mode: 0o600 });
  } catch (error) {
    console.error('Unable to write application log:', error.message);
  }
}

module.exports = {
  logPath,
  info: (message, details) => write('info', message, details),
  warn: (message, details) => write('warning', message, details),
  error: (message, details) => write('error', message, details)
};
