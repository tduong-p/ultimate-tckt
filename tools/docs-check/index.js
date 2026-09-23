'use strict';
function build(docs) {
  const groups = new Map();
  for (const d of [...docs].sort((a, b) => a.path.localeCompare(b.path))) {
    const rel = d.path.replace(/^docs\//, '');
    const g = rel.includes('/') ? rel.split('/')[0] : '(gốc)';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push({ ...d, rel });
  }
  const out = [
    '# Bản đồ tài liệu',
    '',
    '> File này được sinh bởi `npm run docs:index` từ frontmatter. Không sửa tay.',
    '> Đọc `AGENTS.md` ở gốc repo để biết quy tắc cập nhật tài liệu.',
    '',
  ];
  for (const [g, list] of groups) {
    out.push(`## ${g}`, '', '| Tài liệu | Tiêu đề | Version | Trạng thái | Đối tượng |', '|---|---|---|---|---|');
    for (const d of list) {
      const a = (d.data.audience || []).join(', ');
      out.push(`| [${d.data.doc_id || d.rel}](${d.rel}) | ${d.data.title || ''} | ${d.data.version || ''} | ${d.data.status || 'source'} | ${a} |`);
    }
    out.push('');
  }
  return out.join('\n');
}
module.exports = { build };
