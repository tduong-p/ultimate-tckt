'use strict';

function isValid(event) {
  return Boolean(event && event.event && event.sourceKey && event.recipient && event.recipient.email);
}

function createNotifier({ logger, sender = null, timeoutMs = 5000 }) {
  async function notify(event) {
    if (!isValid(event)) {
      logger.warn(`Skipped notification ${event && event.event}: missing event, sourceKey or recipient email.`);
      return { delivered: false, reason: 'invalid-event' };
    }
    if (!sender) {
      logger.debug(`Notification ${event.event} (${event.sourceKey}) not sent: no sender configured.`);
      return { delivered: false, reason: 'no-sender' };
    }
    let timer;
    try {
      const timeout = new Promise((_resolve, reject) => { timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'NOTIFY_TIMEOUT' })), timeoutMs); });
      await Promise.race([sender(event), timeout]);
      return { delivered: true };
    } catch (error) {
      logger.error(`Notification ${event.event} (${event.sourceKey}) failed.`, error);
      return { delivered: false, reason: error.code === 'NOTIFY_TIMEOUT' ? 'timeout' : 'sender-error' };
    } finally {
      clearTimeout(timer);
    }
  }
  return { notify };
}

module.exports = { createNotifier };
