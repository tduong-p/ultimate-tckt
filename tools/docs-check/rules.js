'use strict';
const path = require('node:path');
const { parse } = require('./frontmatter');

const AUDIENCES = new Set(['ba', 'dev', 'ops', 'onboarding', 'ai']);
const STATUSES = new Set(['draft', 'active', 'deprecated']);
const HISTORY = '## Lịch sử phiên bản';

function validate(d, file, body = '') {
  const e = [];
  const req = (k, ok, msg) => { if (!ok) e.push(`${file}: ${k} ${msg}`); };
  req('doc_id', /^[A-Z]+-[A-Z0-9]+-\d{3}$/.test(d.doc_id || ''), 'must look like DEV-ARCH-001');
  req('title', !!d.title, 'is required');
  req('version', /^\d+\.\d+$/.test(d.version || ''), 'must be MAJOR.MINOR');
  req('status', STATUSES.has(d.status), 'must be draft|active|deprecated');
  req('audience', Array.isArray(d.audience) && d.audience.length > 0 && d.audience.every((a) => AUDIENCES.has(a)),
    'must be a non-empty list of ba|dev|ops|onboarding|ai');
  req('owner', !!d.owner, 'is required');
  req('updated', /^\d{4}-\d{2}-\d{2}$/.test(d.updated || ''), 'must be YYYY-MM-DD');
  req('related_code', Array.isArray(d.related_code), 'must be a list (may be empty)');
  req('body', body.includes(HISTORY), `must contain "${HISTORY}"`);
  return e;
}

function compareVersions(a, b) {
  const [a1, a2] = a.split('.').map(Number);
  const [b1, b2] = b.split('.').map(Number);
  return Math.sign(a1 - b1 || a2 - b2);
}

const normalize = (s) => s.split('\n').map((l) => l.replace(/\s+$/, '')).filter((l, i, arr) => l !== '' || arr[i - 1] !== '').join('\n').trim();
function bodyChanged(oldBody, newBody) { return normalize(oldBody) !== normalize(newBody); }

function checkBump(oldText, newText, file) {
  const o = parse(oldText); const n = parse(newText);
  if (!o.data || !n.data) return [];
  if (!bodyChanged(o.body, n.body)) return [];
  const e = [];
  if (compareVersions(n.data.version || '0.0', o.data.version || '0.0') <= 0) {
    e.push(`${file}: content changed but version was not increased (still ${n.data.version})`);
    return e;
  }
  if (n.data.updated === o.data.updated) e.push(`${file}: version bumped but updated date unchanged`);
  if (!new RegExp(`^\\|\\s*${n.data.version.replace('.', '\\.')}\\s*\\|`, 'm').test(n.body)) {
    e.push(`${file}: add a row for ${n.data.version} under "${HISTORY}"`);
  }
  return e;
}

function globToRegExp(glob) {
  const re = glob.split('**').map((part) => part.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*');
  return new RegExp(`^${re}$`);
}

function docsImpact(changedFiles, docs) {
  const changed = new Set(changedFiles);
  const e = [];
  for (const f of changedFiles) {
    if (f.startsWith('docs/')) continue;
    for (const d of docs) {
      const globs = d.data.related_code || [];
      if (globs.some((g) => globToRegExp(g).test(f)) && !changed.has(d.path)) {
        e.push(`${f} changed but ${d.data.doc_id} (${d.path}) was not updated`);
      }
    }
  }
  return [...new Set(e)];
}

// Bỏ khối code rào (``` hoặc ~~~) và code inline trước khi tìm link.
function stripCode(body) {
  return body.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '').replace(/`[^`\n]*`/g, '');
}

function brokenLinks(file, body, exists) {
  const e = [];
  for (const m of stripCode(body).matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = m[1];
    if (/^[a-z]+:/i.test(target) || target.startsWith('#')) continue;
    const p = path.normalize(path.join(path.dirname(file), target.split('#')[0]));
    if (!exists(p)) e.push(`${file}: broken link -> ${target}`);
  }
  return e;
}

module.exports = { validate, compareVersions, bodyChanged, checkBump, globToRegExp, docsImpact, brokenLinks };
