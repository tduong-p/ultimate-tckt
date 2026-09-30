'use strict';
// SPEC-PILOT-001 c26, c27, c29 — số liệu sai, nút sai quyền, giao diện di động.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createTeam, createUser, createActivity, createTask } = require('./helpers/fixtures');

async function withServer(fn) {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try { await fn({ pool, client }); } finally { await close(); await teardown(); }
}

test('c26: archive counts only done tasks in done_count', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const activityId = await createActivity(pool, { team_id: teamId, creator_id: admin.id, status: 'completed' });
  await createTask(pool, { activity_id: activityId, team_id: teamId, assigned_by: admin.id, status: 'done' });
  await createTask(pool, { activity_id: activityId, team_id: teamId, assigned_by: admin.id, status: 'todo' });
  await client.login(admin.email, admin.password);
  const result = await client.request('GET', '/api/archive');
  assert.equal(result.status, 200);
  const row = result.json.find(item => item.id === activityId);
  assert.equal(Number(row.task_count), 2);
  assert.equal(Number(row.done_count), 1);
}));

test('c26: bootstrap openTasks counts only the tasks of the signed-in member', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const member = await createUser(pool, { role: 'member', team_id: teamId });
  const colleague = await createUser(pool, { role: 'member', team_id: teamId });
  const activityId = await createActivity(pool, { team_id: teamId, creator_id: admin.id, status: 'approved' });
  await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: member.id, assigned_by: admin.id });
  await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: colleague.id, assigned_by: admin.id });
  await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: colleague.id, assigned_by: admin.id });
  await client.login(member.email, member.password);
  const result = await client.request('GET', '/api/bootstrap');
  assert.equal(result.status, 200);
  assert.equal(Number(result.json.stats.openTasks), 1);
  assert.equal(result.json.tasks.length, 1);
}));

test('c26: team overview does not count cancelled tasks as open nor list them', () => withServer(async ({ pool, client }) => {
  const teamId = await createTeam(pool);
  const admin = await createUser(pool, { role: 'admin' });
  const member = await createUser(pool, { role: 'member', team_id: teamId });
  const activityId = await createActivity(pool, { team_id: teamId, creator_id: admin.id, status: 'approved' });
  await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: member.id, assigned_by: admin.id, status: 'todo' });
  await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: member.id, assigned_by: admin.id, status: 'cancelled' });
  await client.login(admin.email, admin.password);
  const result = await client.request('GET', `/api/teams/${teamId}/overview`);
  assert.equal(result.status, 200);
  assert.equal(Number(result.json.team.open_tasks), 1);
  assert.equal(result.json.tasks.length, 1);
  assert.equal(Number(result.json.members.find(m => m.id === member.id).open_tasks), 1);
}));

const publicDir = path.join(__dirname, '..', 'public');
const appJs = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(publicDir, 'components.css'), 'utf8');

function ruleBody(source, selector) {
  const match = source.match(new RegExp(`(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `missing CSS rule ${selector}`);
  return match[1];
}

test('c27: "Propose activity" button is only rendered for people who may create activities', () => {
  const at = appJs.indexOf('data-new>');
  assert.ok(at > 0);
  assert.match(appJs.slice(at - 300, at), /isManager\(\)/);
});

test('c27: the team card link to the overview is gated by can_manage', () => {
  assert.doesNotMatch(appJs, /<h3><a href="#team\/\$\{tm\.id\}">\$\{esc\(tm\.name\)\}<\/a><\/h3>/);
});

test('c29: task table scrolls horizontally instead of clipping columns', () => {
  const body = ruleBody(css, '.notion-table-container');
  assert.doesNotMatch(body, /overflow:\s*hidden/);
  assert.match(body, /overflow-x:\s*auto/);
});

test('c29: calendar grid columns can shrink below their content on a 375px screen', () => {
  assert.match(ruleBody(css, '.calendar-grid'), /repeat\(7,\s*minmax\(0,\s*1fr\)\)/);
});
