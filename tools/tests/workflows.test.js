'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const wf = (n) => fs.readFileSync(path.join(__dirname, '..', '..', '.github', 'workflows', n), 'utf8');
const repoFile = (n) => fs.readFileSync(path.join(__dirname, '..', '..', n), 'utf8');

test('Core cutover builds the web bundle from the root context and validates arm64 PR builds without publishing', () => {
  const y = wf('deploy.yml');
  const coreJobStart = y.indexOf('\n  build-core:');
  const coreJobEnd = y.indexOf('\n  build-ctd-api:', coreJobStart);
  const coreJob = y.slice(coreJobStart, coreJobEnd);
  const coreFilter = y.slice(y.indexOf('            core:'), y.indexOf('            ctd:'));
  const dockerfile = repoFile('core/Dockerfile');
  assert.ok(fs.existsSync(path.join(__dirname, '..', '..', '.dockerignore')), 'root .dockerignore exists');
  const dockerignore = repoFile('.dockerignore');

  assert.match(coreFilter, /'web\/\*\*'/);
  assert.match(coreFilter, /'\.dockerignore'/);
  assert.match(y.slice(y.indexOf('            web:'), y.indexOf('            ctd:')), /'web\/\*\*'/);
  assert.match(coreJob, /needs: \[changes, test-core, test-web\]/);
  assert.match(coreJob, /always\(\)/);
  assert.match(coreJob, /needs\.test-core\.result == 'success'/);
  assert.match(coreJob, /needs\.test-web\.result == 'success' \|\| needs\.test-web\.result == 'skipped'/);
  assert.match(coreJob, /context: \./);
  assert.match(coreJob, /file: core\/Dockerfile/);
  assert.match(coreJob, /platforms: linux\/arm64/);
  assert.match(coreJob, /if: github\.event_name == 'push'/);
  assert.match(coreJob, /push: \$\{\{ github\.event_name == 'push' \}\}/);
  assert.match(dockerfile, /FROM node:22-slim AS web-build/);
  assert.match(dockerfile, /COPY --from=web-build \/src\/web\/dist \.\/web-dist/);
  assert.match(dockerignore, /\.git/);
  assert.match(dockerignore, /\*\*\/node_modules/);
  assert.doesNotMatch(dockerignore, /^(web|core\/public)\/?$/m);
  assert.doesNotMatch(coreJob, /deploy-core/);
});

test('deploy.yml wires test -> build -> deploy with gates', () => {
  const y = wf('deploy.yml');
  for (const j of ['changes', 'test-core', 'test-ctd', 'build-core', 'build-ctd-api', 'deploy-core', 'deploy-ctd-api', 'infra']) {
    assert.match(y, new RegExp(`^  ${j}:`, 'm'), j);
  }
  assert.match(y, /needs: \[changes, test-core(?:, test-web)?\]/);
  assert.match(y, /needs: \[changes, test-ctd\]/);
  assert.match(y, /vars\.DEPLOY_ENABLED == 'true'/);
  assert.match(y, /platforms: linux\/arm64/);
  assert.match(y, /ultimate-tckt-core:\$\{\{ needs\.changes\.outputs\.tag \}\}/);
  assert.match(y, /ultimate-tckt-ctd-api:\$\{\{ needs\.changes\.outputs\.tag \}\}/);
  assert.match(y, /\/opt\/ultimate-tckt\/\$\{\{ needs\.changes\.outputs\.env \}\}\/infra\/scripts\/deploy\.sh/);
  assert.match(y, /image: mysql:8/);
  assert.match(y, /image: postgres:16/);
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
  assert.equal((y.match(/provenance: false/g) || []).length, 3);
});

test('ghcr-cleanup keeps 40 versions of both images weekly', () => {
  const y = wf('ghcr-cleanup.yml');
  assert.match(y, /cron:/);
  assert.match(y, /min-versions-to-keep: 40/);
  assert.match(y, /ultimate-tckt-core/);
  assert.match(y, /ultimate-tckt-ctd-api/);
  assert.match(y, /ultimate-tckt-noti\b/);
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

test('deploy.yml: noti has test (real Postgres) -> build -> deploy, deploy to production only behind PROD_NOTI_ENABLED', () => {
  const y = wf('deploy.yml');
  for (const j of ['test-noti', 'build-noti', 'deploy-noti']) assert.match(y, new RegExp(`^  ${j}:`, 'm'), j);
  assert.match(y, /noti:\n\s+- 'services\/noti-api\/\*\*'/);
  assert.match(y, /needs: \[changes, test-noti\]/);
  assert.match(y, /NOTI_TEST_DATABASE_URL: postgresql\+psycopg:\/\/postgres:postgres@localhost:5432\/noti_test/);
  assert.match(y, /ultimate-tckt-noti:\$\{\{ needs\.changes\.outputs\.tag \}\}/);
  const start = y.indexOf('\n  deploy-noti:');
  const job = y.slice(start, y.indexOf('\n    steps:', start)).replace(/\s+/g, ' ');
  assert.ok(job.includes("vars.DEPLOY_ENABLED == 'true' &&"), job);
  assert.ok(job.includes("(needs.changes.outputs.env == 'staging' || vars.PROD_NOTI_ENABLED == 'true')"), job);
  assert.match(y.slice(start), /deploy\.sh \$\{\{ needs\.changes\.outputs\.env \}\} noti /);
});
