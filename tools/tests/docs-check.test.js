'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fm = require('../docs-check/frontmatter');
const rules = require('../docs-check/rules');
const { build } = require('../docs-check/index');

const doc = (over = {}, body = '# T\n\nNội dung.\n\n## Lịch sử phiên bản\n\n| Version | Ngày | Thay đổi | Người |\n|---|---|---|---|\n| 1.0 | 2026-09-23 | Bản đầu | DYC |\n') => {
  const d = { doc_id: 'DEV-ARCH-001', title: 'Kiến trúc', version: '1.0', status: 'active', audience: '[dev, ai]',
    owner: 'DYC', updated: '2026-09-23', related_code: '[core/src/policies/**]', ...over };
  return `---\n${Object.entries(d).map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n${body}`;
};

test('parse reads scalars, arrays and strips comments', () => {
  const { data, body } = fm.parse(doc({ version: '1.2   # MINOR' }));
  assert.equal(data.version, '1.2');
  assert.deepEqual(data.audience, ['dev', 'ai']);
  assert.deepEqual(data.related_code, ['core/src/policies/**']);
  assert.match(body, /^# T/);
});

test('parse returns data null without frontmatter', () => {
  assert.equal(fm.parse('# no fm\n').data, null);
});

test('validate accepts a good doc and reports each bad field', () => {
  const good = fm.parse(doc());
  assert.deepEqual(rules.validate(good.data, 'x.md', good.body), []);
  const bad = fm.parse(doc({ doc_id: 'arch', version: 'v1', status: 'live', audience: '[boss]', updated: '23/9' }, '# T\n'));
  const errs = rules.validate(bad.data, 'x.md', bad.body).join('\n');
  for (const k of ['doc_id', 'version', 'status', 'audience', 'updated', 'Lịch sử phiên bản']) assert.match(errs, new RegExp(k));
});

test('checkBump: body change without version bump fails', () => {
  const a = doc();
  const b = doc({}, doc().split('---\n')[2].replace('Nội dung.', 'Nội dung mới.'));
  assert.match(rules.checkBump(a, b, 'x.md').join('\n'), /version/);
});

test('checkBump: whitespace-only change needs no bump', () => {
  const a = doc();
  const b = a.replace('Nội dung.\n', 'Nội dung.   \n\n');
  assert.deepEqual(rules.checkBump(a, b, 'x.md'), []);
});

test('checkBump: bump with updated date and history row passes', () => {
  const a = doc();
  const body = doc().split('---\n')[2].replace('Nội dung.', 'Nội dung mới.') + '| 1.1 | 2026-09-24 | Sửa | DYC |\n';
  const b = doc({ version: '1.1', updated: '2026-09-24' }, body);
  assert.deepEqual(rules.checkBump(a, b, 'x.md'), []);
});

test('checkBump: bump without history row fails', () => {
  const b = doc({ version: '1.1', updated: '2026-09-24' }, doc().split('---\n')[2].replace('Nội dung.', 'Khác.'));
  assert.match(rules.checkBump(doc(), b, 'x.md').join('\n'), /Lịch sử/);
});

test('compareVersions orders numerically', () => {
  assert.equal(rules.compareVersions('1.10', '1.9'), 1);
  assert.equal(rules.compareVersions('2.0', '2.0'), 0);
  assert.equal(rules.compareVersions('1.0', '2.0'), -1);
});

test('docsImpact flags code changes whose doc did not change', () => {
  const docs = [{ path: 'docs/dev/rbac.md', data: { doc_id: 'DEV-RBAC-001', related_code: ['core/src/policies/**'] } }];
  assert.equal(rules.docsImpact(['core/src/policies/access.js'], docs).length, 1);
  assert.deepEqual(rules.docsImpact(['core/src/policies/access.js', 'docs/dev/rbac.md'], docs), []);
  assert.deepEqual(rules.docsImpact(['core/src/routes/tasks.js'], docs), []);
});

test('brokenLinks finds missing relative targets and ignores urls/anchors', () => {
  const body = '[a](../dev/ok.md) [b](missing.md#x) [c](https://x.y) [d](#top)';
  const exists = (p) => p.endsWith('docs/dev/ok.md');
  const errs = rules.brokenLinks('docs/ops/deploy.md', body, exists);
  assert.equal(errs.length, 1);
  assert.match(errs[0], /missing\.md/);
});

test('build renders a table row per doc grouped by folder', () => {
  const out = build([{ path: 'docs/dev/arch.md', data: { doc_id: 'DEV-ARCH-001', title: 'Kiến trúc', version: '1.0', status: 'active', audience: ['dev'], related_code: [] } }]);
  assert.match(out, /## dev/);
  assert.match(out, /\| \[DEV-ARCH-001\]\(dev\/arch\.md\) \| Kiến trúc \| 1\.0 \| active \| dev \|/);
});

test('brokenLinks ignores links inside fenced and inline code', () => {
  const body = "```js\nconst b = '[a](nope.md)';\n```\nText `[x](nope2.md)` and [real](gone.md)\n~~~\n[y](nope3.md)\n~~~\n";
  const errs = rules.brokenLinks('docs/a.md', body, () => false);
  assert.equal(errs.length, 1, errs.join('\n'));
  assert.match(errs[0], /gone\.md/);
});
