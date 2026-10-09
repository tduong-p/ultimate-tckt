// web/src/core/features/activities/ActivityPlanSection.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { ActivityPlanSection, attachmentHref } from './ActivityPlanSection';
import type { ActivityAttachment, ActivityTaskRow } from '../../api';

const task = (over: Partial<ActivityTaskRow>): ActivityTaskRow => ({
  id: 1,
  activity_id: 5,
  team_id: 2,
  title: 'Dựng sân khấu',
  stage: 'before',
  priority: 'high',
  status: 'in_progress',
  start_date: '2026-11-01',
  deadline: '2026-11-10',
  deliverable: 'Ảnh sân khấu',
  team_name: 'Tuyên huấn',
  primary_assignee_name: 'Nguyễn Văn A',
  checklist_total: 4,
  checklist_done: 1,
  ...over,
});

describe('ActivityPlanSection', () => {
  afterEach(cleanup);

  it('sự kiện: nhóm Trước/Trong/Sau, ẩn việc đã huỷ, hiện chi tiết từng việc', () => {
    render(
      <ActivityPlanSection
        activityType="event"
        attachments={[]}
        tasks={[
          task({ id: 1 }),
          task({ id: 2, title: 'Chạy chương trình', stage: 'during', status: 'open', primary_assignee_name: null, assignee_name: 'Trần B, Lê C' }),
          task({ id: 3, title: 'Việc đã huỷ', status: 'cancelled' }),
        ]}
      />
    );
    const plan = within(screen.getByTestId('section-plan'));
    expect(plan.getByRole('heading', { name: 'Trước' })).toBeDefined();
    expect(plan.getByRole('heading', { name: 'Trong' })).toBeDefined();
    expect(plan.getByRole('heading', { name: 'Sau' })).toBeDefined();
    expect(plan.queryByText('Việc đã huỷ')).toBeNull();

    const row = within(screen.getByTestId('plan-task-1'));
    expect(row.getByText('Dựng sân khấu')).toBeDefined();
    expect(row.getByText('Đang làm')).toBeDefined();
    expect(row.getByText('Nguyễn Văn A')).toBeDefined();
    expect(row.getByText('01/11/2026 – 10/11/2026')).toBeDefined();
    expect(row.getByText('Ảnh sân khấu')).toBeDefined();
    expect(row.getByText('1/4 mục')).toBeDefined();
    expect(within(screen.getByTestId('plan-task-2')).getByText('Trần B, Lê C')).toBeDefined();
    expect(plan.getAllByText('Chưa có công việc')).toHaveLength(1);
  });

  it('hoạt động được giao: chỉ có giai đoạn Chung', () => {
    render(<ActivityPlanSection activityType="assigned" attachments={[]} tasks={[task({ stage: 'general' })]} />);
    expect(screen.getByRole('heading', { name: 'Chung' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Trước' })).toBeNull();
  });

  it('tài liệu theo việc: link http mở được, tệp có sẵn mở qua API, link lạ là chữ thường; có thanh dung lượng', () => {
    const attachments: ActivityAttachment[] = [
      { id: 10, task_id: 1, kind: 'evidence', label: 'Ảnh hiện trường', link_url: 'https://drive.example/anh', size_bytes: null },
      { id: 11, task_id: 1, kind: 'deliverable', label: null, link_url: null, original_name: 'bao-cao.pdf', size_bytes: 2 * 1024 * 1024 },
      { id: 12, task_id: 1, kind: 'clarification', label: 'Link xấu', link_url: 'javascript:alert(1)', size_bytes: null },
      { id: 13, task_id: 99, kind: 'evidence', label: 'Của việc khác', link_url: 'https://x.vn', size_bytes: null },
    ];
    render(<ActivityPlanSection activityType="event" attachments={attachments} tasks={[task({})]} />);
    const row = within(screen.getByTestId('plan-task-1'));
    expect(row.getByRole('link', { name: 'Ảnh hiện trường' }).getAttribute('href')).toBe('https://drive.example/anh');
    expect(row.getByRole('link', { name: 'bao-cao.pdf' }).getAttribute('href')).toBe('/api/task-attachments/11/content');
    expect(row.queryByRole('link', { name: 'Link xấu' })).toBeNull();
    expect(row.getByText('Link xấu')).toBeDefined();
    expect(row.queryByText('Của việc khác')).toBeNull();
    expect(row.getByText('Đã dùng 2 MB / 50 MB')).toBeDefined();
  });

  it('attachmentHref', () => {
    expect(attachmentHref({ id: 1, link_url: 'http://a.vn' })).toBe('http://a.vn');
    expect(attachmentHref({ id: 2, link_url: null })).toBe('/api/task-attachments/2/content');
    expect(attachmentHref({ id: 3, link_url: 'ftp://a' })).toBeNull();
  });
});
