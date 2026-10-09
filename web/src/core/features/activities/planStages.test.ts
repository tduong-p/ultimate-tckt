import { describe, it, expect } from 'vitest';
import { groupTasksByStage } from './planStages';

const task = (id: number, stage: string, status = 'in_progress') => ({ id, stage, status });

describe('groupTasksByStage', () => {
  it('sự kiện có Trước, Trong, Sau và ẩn việc đã huỷ', () => {
    const groups = groupTasksByStage(
      [task(1, 'before'), task(2, 'during'), task(3, 'after'), task(4, 'before', 'cancelled')],
      'event'
    );
    expect(groups.map((g) => [g.label, g.tasks.map((t) => t.id)])).toEqual([
      ['Trước', [1]],
      ['Trong', [2]],
      ['Sau', [3]],
    ]);
  });

  it('stage general hoặc thiếu của sự kiện rơi về Trước', () => {
    const groups = groupTasksByStage([task(1, 'general'), { id: 2, status: 'open' }], 'event');
    expect(groups[0].tasks.map((t) => t.id)).toEqual([1, 2]);
  });

  it('việc được giao chỉ có giai đoạn Chung', () => {
    const groups = groupTasksByStage([task(1, 'before'), task(2, 'general'), task(3, 'after', 'cancelled')], 'assigned');
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Chung');
    expect(groups[0].tasks.map((t) => t.id)).toEqual([1, 2]);
  });

  it('giai đoạn trống vẫn có mặt với danh sách rỗng', () => {
    expect(groupTasksByStage([], 'event').map((g) => g.tasks.length)).toEqual([0, 0, 0]);
  });
});
