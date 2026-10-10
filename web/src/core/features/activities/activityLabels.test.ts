import { describe, it, expect } from 'vitest';
import {
  ACTIVITY_STATUS_META,
  getActivityStatusMeta,
  getActivityTypeLabel,
  getActivityTypeShortLabel,
  getActivityProgressPercent,
  participatesInTeam,
  describeActivityFields,
} from './activityLabels';

describe('activityLabels', () => {
  it('có đủ 6 trạng thái theo enum DB', () => {
    expect(Object.keys(ACTIVITY_STATUS_META).sort()).toEqual(
      ['active', 'approved', 'cancelled', 'changes_requested', 'completed', 'proposed']
    );
  });

  it('changes_requested là "Cần chỉnh sửa" với appearance moved', () => {
    expect(getActivityStatusMeta('changes_requested')).toMatchObject({
      label: 'Cần chỉnh sửa',
      appearance: 'moved',
    });
  });

  it('trạng thái lạ rơi về Đề xuất; in_progress không còn là trạng thái hoạt động', () => {
    expect(getActivityStatusMeta('in_progress').label).toBe('Đề xuất');
    expect(getActivityStatusMeta(undefined).label).toBe('Đề xuất');
  });

  it('nhãn loại: không có type thì trả null', () => {
    expect(getActivityTypeLabel('event')).toBe('Sự kiện đơn vị');
    expect(getActivityTypeLabel('assigned')).toBe('Chỉ đạo cấp trên');
    expect(getActivityTypeLabel(undefined)).toBeNull();
    expect(getActivityTypeShortLabel('event')).toBe('Sự kiện');
    expect(getActivityTypeShortLabel('assigned')).toBe('Chỉ đạo');
    expect(getActivityTypeShortLabel(undefined)).toBeNull();
  });

  it('tiến độ ưu tiên progress_percent, sau đó done/task, rồi null', () => {
    expect(getActivityProgressPercent({ progress_percent: 40, task_count: 10, done_count: 10 })).toBe(40);
    expect(getActivityProgressPercent({ task_count: 4, done_count: 1 })).toBe(25);
    expect(getActivityProgressPercent({ task_count: 0 })).toBe(0);
    expect(getActivityProgressPercent({})).toBe(0);
  });

  it('participatesInTeam khớp Tổ chủ trì hoặc Tổ trong team_names', () => {
    expect(participatesInTeam({ team_id: 1, team_names: 'A, B' }, { id: 1, name: 'Z' })).toBe(true);
    expect(participatesInTeam({ team_id: 9, team_names: 'A, B' }, { id: 2, name: 'B' })).toBe(true);
    expect(participatesInTeam({ team_id: 9, team_names: 'A, B' }, { id: 2, name: 'C' })).toBe(false);
    expect(participatesInTeam({}, { id: 2, name: 'C' })).toBe(false);
  });

  it('describeActivityFields dịch tên trường sang tiếng Việt', () => {
    expect(describeActivityFields(['title', 'team_id', 'lạ'])).toBe('Tiêu đề, Tổ điều phối, lạ');
    expect(describeActivityFields()).toBe('');
  });
});
