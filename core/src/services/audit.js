'use strict';

/**
 * Record an audit log entry.
 * @param {import('mysql2/promise').Pool} db
 * @param {Object} entry
 * @param {number} [entry.actorId] - user.id of the actor (null for system actions)
 * @param {number} [entry.actorUnitId] - unit_id actor is operating from
 * @param {string} entry.action - action performed (e.g. 'cross_unit_read')
 * @param {string} entry.targetType - type of target (e.g. 'http', 'activity', 'task')
 * @param {string|number} [entry.targetId] - identifier of the target (truncated to 191 chars)
 * @param {number} [entry.ownerUnitId] - unit_id that owns the target resource
 * @param {Object} [entry.meta] - additional metadata (will be JSON stringified)
 * @returns {Promise<void>}
 */
async function recordAudit(db, entry) {
  await db.execute(
    'INSERT INTO audit_logs(actor_id, actor_unit_id, action, target_type, target_id, owner_unit_id, meta) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      entry.actorId ?? null,
      entry.actorUnitId ?? null,
      entry.action,
      entry.targetType,
      entry.targetId == null ? null : String(entry.targetId).slice(0, 191),
      entry.ownerUnitId ?? null,
      entry.meta == null ? null : JSON.stringify(entry.meta)
    ]
  );
}

module.exports = { recordAudit };
