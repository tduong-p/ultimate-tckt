import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { ActivityTaskActions } from './ActivityTaskActions';
import { renderApp, makeSession } from './testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchTeamMembers: vi.fn(), fetchWeightPresets: vi.fn(), fetchMembers: vi.fn() };
});

const teams = [{ team_id: 2, name: 'Tổ Sự kiện' }];
const props = { activityId: 9, activityType: 'event', activityStatus: 'active', canManage: true, activityTeams: teams };

describe('ActivityTaskActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchTeamMembers).mockResolvedValue({ members: [], available: [] });
    vi.mocked(api.fetchWeightPresets).mockResolvedValue([]);
    vi.mocked(api.fetchMembers).mockResolvedValue([]);
  });
  afterEach(cleanup);

  it('luôn có liên kết Bảng Kanban trỏ tới /board/:id', () => {
    renderApp(<ActivityTaskActions {...props} canManage={false} activityStatus="completed" />);
    expect(screen.getByRole('link', { name: 'Bảng Kanban' }).getAttribute('href')).toBe('/board/9');
  });

  it('Giao việc chỉ hiện khi canManage; bấm thì mở hộp Giao việc', async () => {
    renderApp(<ActivityTaskActions {...props} canManage={false} />, { session: makeSession({ id: 1, role: 'admin' }) });
    expect(screen.queryByRole('button', { name: 'Giao việc' })).toBeNull();
    cleanup();
    renderApp(<ActivityTaskActions {...props} />, { session: makeSession({ id: 1, role: 'admin' }) });
    fireEvent.click(screen.getByRole('button', { name: 'Giao việc' }));
    expect(await screen.findByLabelText(/Tiêu đề/)).toBeDefined();
  });

  it('Tự ghi nhận chỉ hiện với hoạt động approved/active', async () => {
    renderApp(<ActivityTaskActions {...props} activityStatus="proposed" />);
    expect(screen.queryByRole('button', { name: 'Tự ghi nhận việc' })).toBeNull();
    cleanup();
    renderApp(<ActivityTaskActions {...props} activityStatus="approved" />);
    fireEvent.click(screen.getByRole('button', { name: 'Tự ghi nhận việc' }));
    expect(await screen.findByLabelText(/Tên công việc/)).toBeDefined();
  });
});
