'use strict';

async function recordAudit(db, entry) {
  await db.execute(
    'INSERT INTO audit_logs(actor_id,actor_unit_id,action,target_type,target_id,owner_unit_id,meta) VALUES (?,?,?,?,?,?,?)',
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
