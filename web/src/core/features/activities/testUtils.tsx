// Chỉ dùng trong test: dựng ứng dụng tối giản (React Query + Toast + MemoryRouter) và dữ liệu mẫu.
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../../../shared/components/Toast';
import { BOOTSTRAP_KEY, SESSION_KEY } from '../../queryKeys';
import { EditGuardProvider } from '../../edit/EditGuard';
import type { ActivityDetailData } from './activityEdit';
import type { ActivityItem, TeamItem, SessionMembership, SessionUnit } from '../../api';

/** Hiện đường dẫn hiện tại để test kiểm tra điều hướng. */
export const Probe = () => <div data-testid="path">{useLocation().pathname}</div>;

export interface AppOptions {
  path?: string;
  routePath?: string;
  role?: string;
  userId?: number;
  teams?: TeamItem[];
  memberships?: SessionMembership[];
  currentUnit?: SessionUnit | null;
}

export function renderInApp(ui: React.ReactElement, opts: AppOptions = {}) {
  const { path = '/activity/5', routePath = '/activity/:id', role = 'member', userId = 3, teams = [] } = opts;
  const memberships = opts.memberships ?? [{ unit_id: 1, code: 'TCKT', name: 'Ban TCKT', kind: 'faculty', role }];
  const currentUnit = opts.currentUnit === undefined ? { id: 1, code: 'TCKT', name: 'Ban TCKT', kind: 'faculty' } : opts.currentUnit;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  qc.setQueryData(SESSION_KEY, {
    user: { id: userId, name: 'Người dùng thử', email: 't@x.vn', role },
    units: { current: currentUnit, memberships },
  });
  qc.setQueryData(BOOTSTRAP_KEY, {
    stats: { activeActivities: 0, openTasks: 0, overdueTasks: 0, completedMonth: 0 },
    upcoming: [],
    tasks: [],
    activity: [],
    teams,
    capabilities: { canCreateActivity: true, canCreateAccount: role === 'admin' },
  });
  const utils = render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <EditGuardProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path={routePath} element={ui} />
              <Route path="*" element={<Probe />} />
            </Routes>
          </MemoryRouter>
        </EditGuardProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
  return { qc, ...utils };
}

type DetailOverrides = Partial<Omit<ActivityDetailData, 'activity'>> & { activity?: Partial<ActivityItem> };

export function makeDetail(over: DetailOverrides = {}): ActivityDetailData {
  const base: ActivityDetailData = {
    activity: {
      id: 5,
      title: 'Ngày hội Kỹ thuật',
      description: 'Ngày hội giới thiệu các câu lạc bộ kỹ thuật.',
      type: 'event',
      status: 'proposed',
      priority: 'high',
      team_id: 2,
      creator_id: 9,
      start_date: '2026-11-01',
      deadline: '2026-11-30',
      location: 'Hội trường A',
      requested_by: null,
      event_lead_id: 7,
      event_lead_name: 'Lê Trưởng BTC',
      creator_name: 'Trần Người Tạo',
      team_name: 'Tuyên huấn',
      proposal_document_url: 'https://drive.example/de-an',
      is_public: 0,
      public_image_url: null,
      result_summary: null,
      created_at: '2026-10-01T03:00:00.000Z',
      updated_at: '2026-10-02T03:00:00.000Z',
    },
    activityTeams: [
      { activity_id: 5, team_id: 2, role: 'primary', responsibility: 'Điều phối hoạt động', name: 'Tuyên huấn', color: '#00875A' },
      { activity_id: 5, team_id: 3, role: 'supporting', responsibility: 'Hỗ trợ truyền thông', name: 'Truyền thông', color: '#0052CC' },
    ],
    tasks: [],
    participants: [],
    updates: [],
    people: [],
    taggablePeople: [],
    attachments: [],
    proposalHistory: [],
    canManage: false,
  };
  return { ...base, ...over, activity: { ...base.activity, ...(over.activity ?? {}) } };
}
