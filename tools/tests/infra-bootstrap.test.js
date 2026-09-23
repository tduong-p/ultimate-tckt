'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { makeSandbox, repo } = require('./helpers/sandbox');

const OLD = [
  'TCKT_MYSQL_ROOT_PASSWORD=r', 'TCKT_DB_NAME=seee_db', 'TCKT_DB_USER=u', 'TCKT_DB_PASSWORD=p',
  'TCKT_SESSION_SECRET=s', 'CTD_DB_NAME=c', 'CTD_DB_USER=cu', 'CTD_DB_PASSWORD=cp', 'CTD_JWT_SECRET=j',
].join('\n');

function prep(sb, oldEnv) {
  const oldDir = path.join(sb.root, 'old'); fs.mkdirSync(oldDir);
  fs.writeFileSync(path.join(oldDir, '.env.staging'), oldEnv);
  const infra = path.join(sb.root, 'opt', 'staging', 'infra');
  fs.mkdirSync(path.join(sb.root, 'opt', 'staging', '.git'));
  fs.copyFileSync(path.join(repo, 'infra', '.env.example'), path.join(infra, '.env.example'));
  return { oldDir, envFile: path.join(infra, '.env') };
}

test('bootstrap-vm.sh renames TCKT_ keys, keeps values, generates the settings key', () => {
  const sb = makeSandbox();
  const { oldDir, envFile } = prep(sb, OLD);
  const r = sb.run('bootstrap-vm.sh', ['staging'], { UT_OLD_ENV_DIR: oldDir });
  assert.equal(r.status, 0, r.stderr);
  const env = fs.readFileSync(envFile, 'utf8');
  assert.match(env, /^CORE_DB_NAME=seee_db$/m);
  assert.match(env, /^CTD_JWT_SECRET=j$/m);
  assert.match(env, /^CORE_SETTINGS_ENCRYPTION_KEY=.{20,}$/m);
  assert.doesNotMatch(env, /^TCKT_/m);
  assert.equal(fs.statSync(envFile).mode & 0o777, 0o600);
});

test('bootstrap-vm.sh lists missing keys, exits 2 and writes nothing', () => {
  const sb = makeSandbox();
  const { oldDir, envFile } = prep(sb, OLD.replace('CTD_JWT_SECRET=j', ''));
  const r = sb.run('bootstrap-vm.sh', ['staging'], { UT_OLD_ENV_DIR: oldDir });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /CTD_JWT_SECRET/);
  assert.ok(!fs.existsSync(envFile));
});

test('bootstrap-vm.sh never overwrites an existing .env', () => {
  const sb = makeSandbox();
  const { oldDir, envFile } = prep(sb, OLD);
  fs.writeFileSync(envFile, 'KEEP=1\n');
  const r = sb.run('bootstrap-vm.sh', ['staging'], { UT_OLD_ENV_DIR: oldDir });
  assert.equal(r.status, 0);
  assert.equal(fs.readFileSync(envFile, 'utf8'), 'KEEP=1\n');
});

test('bootstrap-vm.sh clones sparse on the env branch when checkout is missing', () => {
  const sb = makeSandbox();
  const r = sb.run('bootstrap-vm.sh', ['production'], { UT_OLD_ENV_DIR: sb.root });
  const c = sb.calls().join('\n');
  assert.match(c, /git clone --filter=blob:none --sparse --branch main git@github\.com:tduong-p\/ultimate-tckt\.git .*\/opt\/production/);
  assert.match(c, /sparse-checkout set infra/);
  assert.notEqual(r.status, 0); // không có .env.production cũ -> dừng ở bước env
});

test('bootstrap-vm.sh clones from UT_REPO_URL when overridden', () => {
  const sb = makeSandbox();
  const r = sb.run('bootstrap-vm.sh', ['production'], {
    UT_OLD_ENV_DIR: sb.root,
    UT_REPO_URL: 'ssh://git@vm-alias/ultimate-tckt.git',
  });
  const c = sb.calls().join('\n');
  assert.match(c, /git clone --filter=blob:none --sparse --branch main ssh:\/\/git@vm-alias\/ultimate-tckt\.git .*\/opt\/production/);
  assert.notEqual(r.status, 0);
});
