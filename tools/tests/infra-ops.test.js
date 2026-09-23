'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { makeSandbox } = require('./helpers/sandbox');

test('apply-infra.sh staging installs only staging nginx sites, tests before reload', () => {
  const sb = makeSandbox();
  const r = sb.run('apply-infra.sh', ['staging']);
  assert.equal(r.status, 0, r.stderr);
  const c = sb.calls();
  assert.ok(c.some((l) => l.includes('sites-available/ultimate-tckt-staging-core.conf')));
  assert.ok(c.some((l) => l.includes('sites-available/ultimate-tckt-staging-ctd.conf')));
  assert.ok(!c.some((l) => l.includes('ultimate-tckt-production-')));
  const t = c.findIndex((l) => l === 'sudo nginx -t');
  const rl = c.findIndex((l) => l === 'sudo systemctl reload nginx');
  assert.ok(t >= 0 && rl > t, c.join('\n'));
  assert.ok(c.some((l) => l.includes('up -d --no-deps core ctd-api')));
  assert.ok(!c.some((l) => l.includes('core-db')));
});

test('apply-infra.sh production true also applies databases without --no-deps', () => {
  const sb = makeSandbox();
  const r = sb.run('apply-infra.sh', ['production', 'true']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(sb.calls().some((l) => l.includes('-p ultimate-tckt-production') && l.includes('up -d core ctd-api core-db ctd-db')));
});

test('backup.sh writes both dumps under backups/', () => {
  const sb = makeSandbox();
  const r = sb.run('backup.sh', ['staging']);
  assert.equal(r.status, 0, r.stderr);
  const c = sb.calls().join('\n');
  assert.match(c, /exec -T core-db sh -c mysqldump .*\$MYSQL_ROOT_PASSWORD/);
  assert.match(c, /exec -T ctd-db sh -c pg_dump .*\$POSTGRES_USER/);
  // Không bao giờ đưa mật khẩu từ host vào dòng lệnh.
  assert.doesNotMatch(c, /-p[^"$ ]/);
  const files = fs.readdirSync(path.join(sb.root, 'opt', 'backups'));
  assert.ok(files.some((f) => /^staging-\d{8}-\d{4}-core\.sql\.gz$/.test(f)), files.join(','));
  assert.ok(files.some((f) => /^staging-\d{8}-\d{4}-ctd\.sql\.gz$/.test(f)), files.join(','));
});

test('backup.sh on the old stack uses given compose args and tckt-db service', () => {
  const sb = makeSandbox();
  const r = sb.run('backup.sh', ['staging'], { UT_BACKUP_COMPOSE_ARGS: '-p old-staging -f /x.yml' });
  assert.equal(r.status, 0, r.stderr);
  const c = sb.calls().join('\n');
  assert.match(c, /docker compose -p old-staging -f \/x\.yml exec -T tckt-db sh -c mysqldump/);
  assert.match(c, /docker compose -p old-staging -f \/x\.yml exec -T ctd-db sh -c pg_dump/);
});

test('migrate-volumes.sh copies each old volume into its new name', () => {
  const sb = makeSandbox({ dockerOut: { 'volume ls -q': 'seee-ctd-staging_tckt_mysql_data\nseee-ctd-staging_tckt_uploads\nseee-ctd-staging_ctd_postgres_data\nseee-ctd-staging_ctd_documents\n' } });
  const r = sb.run('migrate-volumes.sh', ['staging']);
  assert.equal(r.status, 0, r.stderr);
  const c = sb.calls().join('\n');
  for (const [o, n] of [['tckt_mysql_data', 'core_mysql'], ['tckt_uploads', 'core_uploads'], ['ctd_postgres_data', 'ctd_postgres'], ['ctd_documents', 'ctd_documents']]) {
    assert.match(c, new RegExp(`-v seee-ctd-staging_${o}:/from:ro -v ultimate-tckt-staging_${n}:/to`), o);
  }
});

test('migrate-volumes.sh refuses when a target volume already has data', () => {
  const sb = makeSandbox({ dockerOut: {
    'volume ls -q': 'seee-ctd-staging_tckt_mysql_data\nultimate-tckt-staging_core_mysql\n',
    'ls -A /to': 'ibdata1',
  } });
  const r = sb.run('migrate-volumes.sh', ['staging']);
  assert.equal(r.status, 3);
  assert.match(r.stderr, /already contains data/);
  assert.ok(!sb.calls().some((l) => l.includes('cp -a')));
});
