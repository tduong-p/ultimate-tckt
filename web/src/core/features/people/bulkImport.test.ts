import { describe, it, expect } from 'vitest';
import { parseBulkImport } from './bulkImport';

describe('parseBulkImport', () => {
  it('mỗi dòng "Tên,email"; bỏ dòng trống và khoảng trắng thừa', () => {
    expect(parseBulkImport('  Nguyễn Văn A , a@hust.edu.vn \n\n   \nLê B,b@hust.edu.vn\n')).toEqual([
      { name: 'Nguyễn Văn A', email: 'a@hust.edu.vn' },
      { name: 'Lê B', email: 'b@hust.edu.vn' },
    ]);
  });
  it('tách ở dấu phẩy CUỐI nên tên có dấu phẩy vẫn đúng', () => {
    expect(parseBulkImport('Trần, Thị C, c@hust.edu.vn')).toEqual([{ name: 'Trần, Thị C', email: 'c@hust.edu.vn' }]);
  });
  it('chấp nhận dấu tab (dán từ bảng tính) và xuống dòng kiểu Windows', () => {
    expect(parseBulkImport('A\ta@x.vn\r\nB\tb@x.vn')).toEqual([{ name: 'A', email: 'a@x.vn' }, { name: 'B', email: 'b@x.vn' }]);
  });
  it('dòng không có dấu phân tách vẫn được gửi (server bỏ qua, tính vào "bỏ qua")', () => {
    expect(parseBulkImport('chỉ có một cột')).toEqual([{ name: 'chỉ có một cột', email: '' }]);
  });
  it('rỗng trả mảng rỗng', () => {
    expect(parseBulkImport('  \n \n')).toEqual([]);
  });
});
