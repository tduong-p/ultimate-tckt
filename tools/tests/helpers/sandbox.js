'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repo = path.join(__dirname, '..', '..', '..');

function makeSandbox({ curlCode = '200', dockerOut = {}, sudoFail = '' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ut-'));
  const bin = path.join(root, 'bin');
  const logFile = path.join(root, 'calls.log');
  fs.mkdirSync(bin);
  const stub = (name, body = '') => {
    fs.writeFileSync(path.join(bin, name),
      `#!/usr/bin/env bash\necho "${name} $*" >> "${logFile}"\n${body}\nexit 0\n`, { mode: 0o755 });
  };
  for (const n of ['git', 'nginx', 'systemctl', 'certbot', 'flock', 'gzip']) stub(n);
  // sudo: thất bại (exit 1) khi lệnh khớp sudoFail, để giả lập vd `nginx -t` lỗi
  stub('sudo', sudoFail ? `[[ "$*" == ${JSON.stringify(sudoFail)} ]] && exit 1` : '');
  stub('curl', `echo -n "${curlCode}"`);
  // docker: trả output theo khoá "docker <sub>" nếu được cấu hình
  const cases = Object.entries(dockerOut)
    .map(([k, v]) => `  *"${k}"*) printf '%b' ${JSON.stringify(v)} ;;`).join('\n');
  stub('docker', `case "$*" in\n${cases}\n  *) : ;;\nesac`);
  for (const env of ['staging', 'production']) {
    fs.mkdirSync(path.join(root, 'opt', env, 'infra', 'compose'), { recursive: true });
  }
  return {
    root,
    bin,
    logFile,
    run(script, args = [], env = {}) {
      const r = spawnSync('bash', [path.join(repo, 'infra', 'scripts', script), ...args], {
        encoding: 'utf8',
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, UT_ROOT: path.join(root, 'opt'),
          UT_LOCK_DIR: root, UT_HEALTH_INTERVAL: '0', ...env },
      });
      return { status: r.status, stdout: r.stdout, stderr: r.stderr };
    },
    calls() { return fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').trim().split('\n') : []; },
  };
}
module.exports = { makeSandbox, repo };
