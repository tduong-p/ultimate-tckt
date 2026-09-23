'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { makeSandbox } = require('./helpers/sandbox');

test('deploy.sh staging core pulls staging branch then pulls+ups only core', () => {
  const sb = makeSandbox();
  const r = sb.run('deploy.sh', ['staging', 'core', 'abc123def456']);
  assert.equal(r.status, 0, r.stderr);
  const c = sb.calls();
  const gi = c.findIndex((l) => l.startsWith('git ') && l.includes('pull --ff-only origin staging'));
  const pi = c.findIndex((l) => l.includes('docker compose -p ultimate-tckt-staging') && l.includes(' pull core'));
  const ui = c.findIndex((l) => l.includes('docker compose -p ultimate-tckt-staging') && l.includes(' up -d --no-deps core'));
  assert.ok(gi >= 0 && pi > gi && ui > pi, c.join('\n'));
  assert.ok(c.some((l) => l.startsWith('curl ') && l.includes('127.0.0.1:3000/api/health')));
});

test('deploy.sh production ctd-api uses main branch and port 8001', () => {
  const sb = makeSandbox();
  const r = sb.run('deploy.sh', ['production', 'ctd-api', 'abc123def456']);
  assert.equal(r.status, 0, r.stderr);
  const c = sb.calls();
  assert.ok(c.some((l) => l.includes('pull --ff-only origin main')));
  assert.ok(c.some((l) => l.includes('-p ultimate-tckt-production') && l.includes('up -d --no-deps ctd-api')));
  assert.ok(c.some((l) => l.includes('127.0.0.1:8001/api/health')));
});

test('deploy.sh exports the right image tag variable', () => {
  const sb = makeSandbox();
  // stub docker in ra biến môi trường khi được gọi
  require('node:fs').writeFileSync(`${sb.bin}/docker`,
    `#!/usr/bin/env bash\necho "docker $* CORE=\${CORE_IMAGE_TAG:-} CTD=\${CTD_API_IMAGE_TAG:-}" >> "${sb.logFile}"\n`, { mode: 0o755 });
  sb.run('deploy.sh', ['staging', 'ctd-api', 'feedbeef0001']);
  assert.ok(sb.calls().some((l) => l.includes('up -d') && l.includes('CTD=feedbeef0001')));
});

for (const args of [['stagin', 'core', 't'], ['staging', 'tckt', 't'], ['staging', 'core']]) {
  test(`deploy.sh ${args.join(' ')} fails before touching git or docker`, () => {
    const sb = makeSandbox();
    const r = sb.run('deploy.sh', args);
    assert.notEqual(r.status, 0);
    assert.ok(!sb.calls().some((l) => /^(git|docker) /.test(l)), sb.calls().join('\n'));
  });
}

test('deploy.sh exits non-zero when health check never returns 200', () => {
  const sb = makeSandbox({ curlCode: '502' });
  const r = sb.run('deploy.sh', ['staging', 'core', 'abc'], { UT_HEALTH_TIMEOUT: '1' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /health/i);
});
