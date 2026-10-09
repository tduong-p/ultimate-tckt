// Helper dùng chung cho test của features/tasks (không import ở code chạy thật).
import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../../../shared/components/Toast';
import { BOOTSTRAP_KEY, SESSION_KEY } from '../../queryKeys';
import type { BootstrapData, SessionData, TeamItem } from '../../api';

export function makeSession(opts: { id?: number; role?: string } = {}): SessionData {
  const role = opts.role ?? 'member';
  return {
    user: { id: opts.id ?? 7, name: 'Người dùng', email: 'u@x.vn', role },
    units: {
      current: { id: 1, code: 'tckt', name: 'TCKT', kind: 'union' },
      memberships: [{ unit_id: 1, code: 'tckt', name: 'TCKT', kind: 'union', role }],
    },
  };
}

export function makeBootstrap(teams: Partial<TeamItem>[] = []): BootstrapData {
  return {
    stats: { activeActivities: 0, openTasks: 0, overdueTasks: 0, completedMonth: 0 },
    upcoming: [],
    tasks: [],
    activity: [],
    teams: teams.map((t, i) => ({ id: i + 1, name: `Tổ ${i + 1}`, can_manage: 0, ...t })) as TeamItem[],
    capabilities: { canCreateActivity: true, canCreateAccount: false },
  };
}

/** Bọc Query (cache đã có session + bootstrap, không tự tải lại), Toast và MemoryRouter. */
export function renderApp(
  ui: React.ReactElement,
  opts: { session?: SessionData; teams?: Partial<TeamItem>[]; path?: string; routePath?: string } = {}
) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  qc.setQueryData(SESSION_KEY, opts.session ?? makeSession());
  qc.setQueryData(BOOTSTRAP_KEY, makeBootstrap(opts.teams));
  const body = opts.routePath ? (
    <Routes>
      <Route path={opts.routePath} element={ui} />
    </Routes>
  ) : (
    ui
  );
  const utils = render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={[opts.path ?? '/']}>{body}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
  return { qc, ...utils };
}
