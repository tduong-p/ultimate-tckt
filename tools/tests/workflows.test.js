'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const wf = (n) => fs.readFileSync(path.join(__dirname, '..', '..', '.github', 'workflows', n), 'utf8');

test('deploy.yml wires test -> build -> deploy with gates', () => {
  const y = wf('deploy.yml');
  for (const j of ['changes', 'test-core', 'test-ctd', 'build-core', 'build-ctd-api', 'deploy-core', 'deploy-ctd-api', 'infra']) {
    assert.match(y, new RegExp(`^  ${j}:`, 'm'), j);
  }
  assert.match(y, /needs: \[changes, test-core\]/);
  assert.match(y, /needs: \[changes, test-ctd\]/);
  assert.match(y, /vars\.DEPLOY_ENABLED == 'true'/);
  assert.match(y, /platforms: linux\/arm64/);
  assert.match(y, /ultimate-tckt-core:\$\{\{ needs\.changes\.outputs\.tag \}\}/);
  assert.match(y, /ultimate-tckt-ctd-api:\$\{\{ needs\.changes\.outputs\.tag \}\}/);
  assert.match(y, /\/opt\/ultimate-tckt\/\$\{\{ needs\.changes\.outputs\.env \}\}\/infra\/scripts\/deploy\.sh/);
  assert.match(y, /image: mysql:8/);
  assert.doesNotMatch(y, /image: postgres:16/);
  assert.doesNotMatch(y, /seee|tckt-activity-hub|\/opt\/infra/);
});

test('deploy.yml changes job may read PR file list (paths-filter on pull_request)', () => {
  const y = wf('deploy.yml');
  const job = y.slice(y.indexOf('\n  changes:'), y.indexOf('\n  test-core:'));
  assert.match(job, /permissions: \{ contents: read, pull-requests: read \}/);
});

test('deploy.yml: no shared job concurrency group (pending deploys would be cancelled); VM flock serialises', () => {
  const y = wf('deploy.yml');
  assert.doesNotMatch(y, /group: vm-deploy-/);
});

test('deploy.yml: production deploys need their own switch PROD_DEPLOY_ENABLED', () => {
  const y = wf('deploy.yml');
  const gate = "vars.DEPLOY_ENABLED == 'true' && (needs.changes.outputs.env == 'staging' || vars.PROD_DEPLOY_ENABLED == 'true')";
  for (const j of ['deploy-core', 'deploy-ctd-api', 'infra']) {
    const start = y.indexOf(`\n  ${j}:`);
    const next = y.indexOf('\n  ', start + 4 + j.length);
    const job = y.slice(start, y.indexOf('\n    steps:', start));
    assert.ok(job.replace(/\s+/g, ' ').includes(gate), `${j} gate`);
  }
});

test('deploy.yml: images built without provenance (no untagged child versions eating the GHCR keep window)', () => {
  const y = wf('deploy.yml');
  assert.equal((y.match(/provenance: false/g) || []).length, 2);
});

test('ghcr-cleanup keeps 40 versions of both images weekly', () => {
  const y = wf('ghcr-cleanup.yml');
  assert.match(y, /cron:/);
  assert.match(y, /min-versions-to-keep: 40/);
  assert.match(y, /ultimate-tckt-core/);
  assert.match(y, /ultimate-tckt-ctd-api/);
});

test('docs.yml checks every PR/push and tags docs on main', () => {
  const y = wf('docs.yml');
  assert.match(y, /^  docs:/m);
  assert.match(y, /docs:check -- --base/);
  assert.match(y, /no-docs-needed/);
  assert.match(y, /docs-v/);
  assert.match(y, /pandoc/);
  // Tác động code→tài liệu gác ở PR (ruleset bắt buộc PR); push chỉ kiểm frontmatter/bump.
  assert.match(y, /NO_DOCS: \$\{\{ github\.event_name == 'push' \|\| contains\(github\.event\.pull_request\.labels\.\*\.name, 'no-docs-needed'\) \}\}/);
});
