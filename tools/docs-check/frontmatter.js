'use strict';
// YAML phẳng tối giản: "key: value" và "key: [a, b]". Đủ cho frontmatter tài liệu; không cần dependency.
function parseValue(raw) {
  const v = raw.replace(/\s+#.*$/, '').trim();
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    return inner ? inner.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')) : [];
  }
  return v.replace(/^['"]|['"]$/g, '');
}

function parse(text) {
  // Support both LF (\n) and CRLF (\r\n) line endings
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return { data: null, body: text };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (kv) data[kv[1]] = parseValue(kv[2]);
  }
  return { data, body: text.slice(m[0].length) };
}

module.exports = { parse };
