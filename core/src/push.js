const logger = require('./logger');

const appId = String(process.env.ONESIGNAL_APP_ID || '').trim();
const apiKey = String(process.env.ONESIGNAL_API_KEY || '').trim();
const enabled = Boolean(appId && apiKey);

async function send({ userId, title, message, url }) {
  if (!enabled) throw Object.assign(new Error('OneSignal is not configured on the server.'), { code: 'PUSH_DISABLED' });
  if (!userId) throw Object.assign(new Error('The push notification recipient is missing.'), { code: 'PUSH_RECIPIENT_MISSING' });
  const response = await fetch('https://api.onesignal.com/notifications?c=push', {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: appId,
      target_channel: 'push',
      include_aliases: { external_id: [String(userId)] },
      headings: { en: title },
      contents: { en: message },
      ...(url ? { url } : {})
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`OneSignal request failed with status ${response.status}.`);
    error.status = response.status;
    error.response = result;
    throw error;
  }
  return result;
}

function reportDelivery(description, callback, status) {
  if (!callback) return;
  Promise.resolve(callback(status)).catch(error => logger.error(`Unable to record push notification status: ${description}.`, error));
}

function queuePush(description, notification, onDelivery) {
  if (!enabled) {
    reportDelivery(description, onDelivery, 'failed');
    return;
  }
  setImmediate(() => send(notification)
    .then(result => {
      logger.info(`Push notification accepted: ${description}.`, { notificationId: result.id || null });
      reportDelivery(description, onDelivery, 'success');
    })
    .catch(error => {
      logger.error(`Push notification failed: ${description}.`, { name: error.name, message: error.message, status: error.status, response: error.response });
      reportDelivery(description, onDelivery, 'failed');
    }));
}

module.exports = { enabled, appId, queuePush };
