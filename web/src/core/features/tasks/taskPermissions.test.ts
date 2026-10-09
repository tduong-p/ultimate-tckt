import { describe, it, expect } from 'vitest';
import {
  assigneeIdsOf,
  normalizeTaskStatus,
  isAssignedTo,
  isSubmittable,
  canMoveTask,
  canSubmitForReview,
  canReviewTask,
  canCancelSelfLogged,
} from './taskPermissions';

const task = (
  over: Partial<{ status: string; assignee_ids: string | null; is_self_logged: number | null; team_id: number }> = {}
) => ({
  status: 'todo',
  assignee_ids: '7,8',
  is_self_logged: 0,
  team_id: 2,
  ...over,
});

describe('taskPermissions', () => {
  it('tách danh sách người được giao và chuẩn hoá trạng thái cũ', () => {
    expect(assigneeIdsOf({ assignee_ids: '7, 8,x' })).toEqual([7, 8]);
    expect(assigneeIdsOf({ assignee_ids: null })).toEqual([]);
    expect(normalizeTaskStatus('open')).toBe('todo');
    expect(normalizeTaskStatus('review')).toBe('review');
    expect(isAssignedTo(task(), 8)).toBe(true);
    expect(isAssignedTo(task(), null)).toBe(false);
  });

  it('đổi trạng thái: người được giao hoặc quản lý Tổ, chỉ khi todo/in_progress', () => {
    expect(canMoveTask(task(), { userId: 7, manages: false })).toBe(true);
    expect(canMoveTask(task(), { userId: 99, manages: true })).toBe(true);
    expect(canMoveTask(task(), { userId: 99, manages: false })).toBe(false);
    expect(canMoveTask(task({ status: 'review' }), { userId: 7, manages: true })).toBe(false);
  });

  it('nộp nghiệm thu chỉ cho người được giao, không cho quản lý Tổ không được giao', () => {
    expect(canSubmitForReview(task({ status: 'in_progress' }), 7)).toBe(true);
    expect(canSubmitForReview(task(), 99)).toBe(false);
    expect(canSubmitForReview(task({ status: 'done' }), 7)).toBe(false);
    expect(isSubmittable('open')).toBe(true);
    expect(isSubmittable('review')).toBe(false);
  });

  it('duyệt: trạng thái review và admin / quản lý Tổ / Trưởng BTC', () => {
    const review = task({ status: 'review' });
    expect(canReviewTask(review, { isExec: true, manages: false, isEventLead: false })).toBe(true);
    expect(canReviewTask(review, { isExec: false, manages: true, isEventLead: false })).toBe(true);
    expect(canReviewTask(review, { isExec: false, manages: false, isEventLead: true })).toBe(true);
    expect(canReviewTask(review, { isExec: false, manages: false, isEventLead: false })).toBe(false);
    expect(canReviewTask(task(), { isExec: true, manages: true, isEventLead: true })).toBe(false);
  });

  it('rút lại: việc tự ghi nhận, được giao, chưa xong hoặc huỷ', () => {
    expect(canCancelSelfLogged(task({ is_self_logged: 1, status: 'review' }), 7)).toBe(true);
    expect(canCancelSelfLogged(task({ is_self_logged: 0, status: 'review' }), 7)).toBe(false);
    expect(canCancelSelfLogged(task({ is_self_logged: 1, status: 'done' }), 7)).toBe(false);
    expect(canCancelSelfLogged(task({ is_self_logged: 1, status: 'review' }), 99)).toBe(false);
  });
});
