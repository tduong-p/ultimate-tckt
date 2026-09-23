#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { parse } = require('./frontmatter');
const rules = require('./rules');
const { build } = require('./index');

const ROOT = path.join(__dirname, '..', '..');
const GENERATED = new Set(['docs/README.md', 'docs/CHANGELOG.md']);
const isSource = (p) => p.startsWith('docs/ba/nguon/');

function walk(dir) {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    return e.isDirectory() ? walk(rel) : (e.name.endsWith('.md') ? [rel] : []);
  });
}

function loadDocs() {
  return walk('docs').filter((p) => !GENERATED.has(p)).map((p) => {
    const text = fs.readFileSync(path.join(ROOT, p), 'utf8');
    return { path: p, text, ...parse(text) };
  });
}

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' });

function cmdIndex() {
  const docs = loadDocs().filter((d) => d.data && !isSource(d.path));
  fs.writeFileSync(path.join(ROOT, 'docs/README.md'), build(docs) + '\n');
  console.log(`docs/README.md: ${docs.length} documents`);
}

function cmdCheck(args) {
  const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : null;
  const allowNoDocs = args.includes('--allow-no-docs');
  const docs = loadDocs();
  const errors = [];
  const ids = new Map();
  for (const d of docs) {
    if (isSource(d.path)) continue;
    if (!d.data) { errors.push(`${d.path}: missing frontmatter`); continue; }
    errors.push(...rules.validate(d.data, d.path, d.body));
    if (ids.has(d.data.doc_id)) errors.push(`${d.path}: doc_id ${d.data.doc_id} also used by ${ids.get(d.data.doc_id)}`);
    ids.set(d.data.doc_id, d.path);
  }
  for (const f of [...walk('docs'), 'AGENTS.md', 'README.md'].filter((p) => fs.existsSync(path.join(ROOT, p)))) {
    const body = fs.readFileSync(path.join(ROOT, f), 'utf8');
    errors.push(...rules.brokenLinks(f, body, (p) => fs.existsSync(path.join(ROOT, p))));
  }
  const expectedIndex = build(docs.filter((d) => d.data && !isSource(d.path))) + '\n';
  const actualIndex = fs.existsSync(path.join(ROOT, 'docs/README.md')) ? fs.readFileSync(path.join(ROOT, 'docs/README.md'), 'utf8') : '';
  if (expectedIndex !== actualIndex) errors.push('docs/README.md is out of date — run: npm run docs:index');

  if (base) {
    const changed = git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean);
    for (const f of changed.filter((p) => p.startsWith('docs/') && p.endsWith('.md') && !GENERATED.has(p) && !isSource(p))) {
      if (!fs.existsSync(path.join(ROOT, f))) continue;
      let old = '';
      try { old = git('show', `${base}:${f}`); } catch { continue; } // file mới
      errors.push(...rules.checkBump(old, fs.readFileSync(path.join(ROOT, f), 'utf8'), f));
    }
    if (!allowNoDocs) errors.push(...rules.docsImpact(changed, docs.filter((d) => d.data)));
  }

  for (const e of errors) console.error(e);
  if (errors.length) { console.error(`\n${errors.length} documentation problem(s).`); process.exit(1); }
  console.log(`docs ok: ${docs.length} files checked`);
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'index') cmdIndex();
else if (cmd === 'check') cmdCheck(rest);
else { console.error('usage: cli.js index | check [--base <ref>] [--allow-no-docs]'); process.exit(2); }
