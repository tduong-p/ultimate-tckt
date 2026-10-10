import { describe, expect, it } from 'vitest';
import { groupMine, parseTab, type MineTask } from './mineTasks';

const TODAY = '2026-10-10';
const t = (id: number, over: Partial<MineTask> = {}): MineTask => ({
  id, title: `Việc ${id}`, status: 'todo', priority: 'medium', deadline: TODAY,
  team_id: 1, team_name: 'Tổ 1', activity_id: 1, activity_title: 'HĐ', primary_assignee_id: 7, assignee_name: 'An',
  acknowledged_at: null, review_feedback: null, ...over,
});
const ids = (list: MineTask[]) => list.map((x) => x.id);

describe('parseTab', () => {
  it('thiếu tab = all (giữ nghĩa của #/my-tasks cũ), tab sai = today', () => {
    expect(parseTab(null)).toBe('all');
    expect(parseTab('')).toBe('all');
    expect(parseTab('abc')).toBe('today');
    expect(parseTab('overdue')).toBe('overdue');
    expect(parseTab('review')).toBe('review');
  });
});

describe('groupMine', () => {
  const mine = [
    t(1, { deadline: '2026-10-09' }), // hôm qua
    t(2, { deadline: TODAY }),
    t(3, { deadline: '2026-10-11' }), // ngày mai
    t(4, { deadline: '2026-10-11', status: 'in_progress' }), // đang làm, hạn tương lai
    t(5, { deadline: '2026-10-09', status: 'in_progress' }), // đang làm nhưng đã quá hạn
    t(6, { deadline: TODAY, status: 'done' }),
    t(7, { deadline: '2026-10-01', status: 'cancelled' }),
    t(8, { deadline: null, status: 'in_progress' }),
    t(9, { deadline: null }),
    t(10, { deadline: '2026-10-09', status: 'review' }),
  ];
  const g = groupMine(mine, [t(20, { status: 'review' }), t(21, { status: 'done' })], TODAY);

  it('Hôm nay: hạn hôm nay hoặc đang làm (chưa quá hạn), bỏ việc xong/huỷ', () => {
    expect(ids(g.today)).toEqual([2, 4, 8]);
  });
  it('Quá hạn: hạn trước hôm nay, chưa xong/huỷ (kể cả đang làm / chờ duyệt)', () => {
    expect(ids(g.overdue)).toEqual([1, 5, 10]);
  });
  it('Chờ tôi duyệt: lấy từ truy vấn pending_review, bỏ việc đã xong/huỷ', () => {
    expect(ids(g.review)).toEqual([20]);
  });
  it('Tất cả: mọi việc của tôi chưa xong/huỷ', () => {
    expect(ids(g.all)).toEqual([1, 2, 3, 4, 5, 8, 9, 10]);
  });
});
