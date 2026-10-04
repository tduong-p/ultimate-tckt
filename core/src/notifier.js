'use strict';

const { isDeliverableEmail, emailDomain } = require('./email');

const MAX_ATTEMPTS = 3;
const defaultSleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function isValid(event) {
  return Boolean(event && event.event && event.sourceKey && event.recipient && event.recipient.email);
}

function isSelf(event) {
  const { actorId, recipient } = event;
  return actorId !== undefined && actorId !== null
    && recipient.id !== undefined && recipient.id !== null
    && String(actorId) === String(recipient.id);
}

function createNotifier({ logger, sender = null, timeoutMs = 5000, retryDelaysMs = [1000, 3000], sleep = defaultSleep }) {
  async function attempt(event) {
    let timer;
    try {
      const timeout = new Promise((_resolve, reject) => { timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'NOTIFY_TIMEOUT' })), timeoutMs); });
      await Promise.race([sender(event), timeout]);
      return { delivered: true };
    } catch (error) {
      const timedOut = error.code === 'NOTIFY_TIMEOUT';
      logger.error(`Notification ${event.event} (${event.sourceKey}) failed.`, error);
      const failure = { delivered: false, reason: timedOut ? 'timeout' : 'sender-error' };
      if (timedOut || error.transient === true) failure.retryable = true;
      return failure;
    } finally {
      clearTimeout(timer);
    }
  }

  async function notify(event) {
    if (!isValid(event)) {
      logger.warn(`Skipped notification ${event && event.event}: missing event, sourceKey or recipient email.`);
      return { delivered: false, reason: 'invalid-event' };
    }
    if (isSelf(event)) {
      logger.info(`Notification ${event.event} (${event.sourceKey}) skipped: recipient is the actor.`);
      return { delivered: false, reason: 'self' };
    }
    if (!isDeliverableEmail(event.recipient.email)) {
      logger.warn(`Skipped notification ${event.event} (${event.sourceKey}): undeliverable email (domain ${emailDomain(event.recipient.email)}).`);
      return { delivered: false, reason: 'invalid-email' };
    }
    if (!sender) {
      logger.info(`Notification ${event.event} (${event.sourceKey}) not sent: no sender configured.`);
      return { delivered: false, reason: 'no-sender' };
    }
    let result;
    for (let n = 1; n <= MAX_ATTEMPTS; n += 1) {
      result = await attempt(event);
      if (result.delivered || !result.retryable || n === MAX_ATTEMPTS) break;
      await sleep(retryDelaysMs[n - 1] ?? retryDelaysMs[retryDelaysMs.length - 1] ?? 0);
    }
    return result;
  }
  return { notify };
}

module.exports = { createNotifier };
