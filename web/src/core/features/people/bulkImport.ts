import type { BulkImportRow } from '../../api';

/** Mỗi dòng "Tên,email" hoặc Tên<Tab>email; tách ở dấu phân tách cuối để giữ dấu phẩy trong tên. */
export function parseBulkImport(text: string): BulkImportRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cut = Math.max(line.lastIndexOf(','), line.lastIndexOf('\t'));
      if (cut < 0) return { name: line, email: '' };
      return { name: line.slice(0, cut).trim(), email: line.slice(cut + 1).trim() };
    });
}
