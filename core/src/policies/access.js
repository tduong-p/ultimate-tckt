function createAccessPolicies(db, isLeadership, isExecutive = (u => ['admin', 'vice_admin'].includes((u?.unitRole || u?.role)))) {
  function activityScope(viewer, alias = 'a') {
    if (isExecutive(viewer)) return { sql: '1=1', params: [] };
    return { sql: `(${alias}.is_public=1 OR ${alias}.event_lead_id=? OR ${alias}.creator_id=? OR EXISTS(SELECT 1 FROM participants sp WHERE sp.activity_id=${alias}.id AND sp.user_id=?) OR EXISTS(SELECT 1 FROM activity_teams sat JOIN user_teams sut ON sut.team_id=sat.team_id WHERE sat.activity_id=${alias}.id AND sut.user_id=?))`, params: [viewer.id, viewer.id, viewer.id, viewer.id] };
  }
  async function leadsTeam(userId, teamId) { const [rows] = await db.execute('SELECT 1 FROM user_teams WHERE user_id=? AND team_id=? AND (is_lead=1 OR is_vice_lead=1)', [userId, teamId]); return !!rows.length; }
  async function belongsToTeam(userId, teamId) { const [rows] = await db.execute('SELECT 1 FROM user_teams WHERE user_id=? AND team_id=?', [userId, teamId]); return !!rows.length; }
  async function canManageTeam(viewer, teamId) { return isExecutive(viewer) || (isLeadership(viewer) && await leadsTeam(viewer.id, teamId)); }
  async function managedTeamIds(viewer) { if (isExecutive(viewer)) { const [rows] = await db.execute('SELECT id FROM teams WHERE is_active=1'); return rows.map(row => row.id); } const [rows] = await db.execute('SELECT team_id id FROM user_teams WHERE user_id=? AND (is_lead=1 OR is_vice_lead=1)', [viewer.id]); return rows.map(row => row.id); }
  async function canManageUser(viewer, targetId) { if (isExecutive(viewer)) return true; if (!isLeadership(viewer) || Number(targetId) === Number(viewer.id)) return false; const [rows] = await db.execute("SELECT 1 FROM users u JOIN user_teams theirs ON theirs.user_id=u.id JOIN user_teams mine ON mine.team_id=theirs.team_id AND mine.user_id=? AND (mine.is_lead=1 OR mine.is_vice_lead=1) WHERE u.id=? AND u.role='member' AND NOT EXISTS(SELECT 1 FROM user_teams other WHERE other.user_id=u.id AND NOT EXISTS(SELECT 1 FROM user_teams mgr WHERE mgr.team_id=other.team_id AND mgr.user_id=? AND (mgr.is_lead=1 OR mgr.is_vice_lead=1))) LIMIT 1", [viewer.id, targetId, viewer.id]); return !!rows.length; }
  async function canManageActivity(viewer, activityId) {
    if (isExecutive(viewer)) return true;
    const [rows] = await db.execute(
      `SELECT 1 FROM activities a
       LEFT JOIN activity_teams at ON at.activity_id=a.id
       LEFT JOIN user_teams ut ON ut.team_id=at.team_id
       WHERE a.id=? AND (a.creator_id=? OR a.event_lead_id=? OR (ut.user_id=? AND (ut.is_lead=1 OR ut.is_vice_lead=1)))
       LIMIT 1`,
      [activityId, viewer.id, viewer.id, viewer.id]
    );
    return !!rows.length;
  }
  async function visibleActivity(viewer, activityId) { const scope = activityScope(viewer); const [rows] = await db.execute(`SELECT 1 FROM activities a WHERE a.id=? AND ${scope.sql}`, [activityId, ...scope.params]); return !!rows.length; }
  async function canReviewTask(viewer, task) {
    const isExec = isExecutive(viewer);
    const leads = await leadsTeam(viewer.id, task.team_id);
    const [eventLeadRows] = await db.execute('SELECT 1 FROM activities WHERE id=? AND event_lead_id=?', [task.activity_id, viewer.id]);
    const isEventLead = Boolean(eventLeadRows.length);

    // Leadership can review (and can bypass Anti-Self-Review for their own tasks)
    if (isExec || leads || isEventLead) return true;

    // Regular members cannot review tasks
    return false;
  }

  async function scopeFor(viewer, resourceType, options = {}) {
    const alias = options.alias || 'a';
    if (viewer.unit && viewer.unit.kind === 'platform_owner') {
      return { sql: '1=1', params: [] };
    }

    let sameUnitSql = `${alias}.unit_id=?`;
    let sameUnitParams = [viewer.unit.id];

    if (resourceType === 'activities') {
      const scope = activityScope(viewer, alias);
      // activityScope already returns 1=1 if executive, we need to namespace it to unit_id
      if (scope.sql === '1=1') {
        sameUnitSql = `${alias}.unit_id=?`;
      } else {
        sameUnitSql = `(${alias}.unit_id=? AND ${scope.sql})`;
        sameUnitParams.push(...scope.params);
      }
    }

    // For teams resource type, just use unit_id filter (no additional scoping needed)
    // Teams are unit-scoped by default via teams.unit_id

    // Check policies for cross-unit visibility
    const [policyRows] = await db.execute('SELECT owner_unit_id, level FROM unit_visibility_policies WHERE viewer_unit_id=?', [viewer.unit.id]);
    const visibleUnits = policyRows.map(r => r.owner_unit_id);

    if (visibleUnits.length > 0) {
      const placeholders = visibleUnits.map(() => '?').join(',');
      return {
        sql: `(${sameUnitSql} OR ${alias}.unit_id IN (${placeholders}))`,
        params: [...sameUnitParams, ...visibleUnits]
      };
    }

    return { sql: sameUnitSql, params: sameUnitParams };
  }

  return { activityScope, leadsTeam, belongsToTeam, canManageTeam, managedTeamIds, canManageUser, canManageActivity, visibleActivity, canReviewTask, scopeFor };
}

module.exports = { createAccessPolicies };
