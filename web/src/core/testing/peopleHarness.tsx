import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../../shared/components/Toast';
import { BOOTSTRAP_KEY, SESSION_KEY } from '../queryKeys';

export interface HarnessTeam {
  id: number;
  name: string;
  can_manage?: boolean;
}

export interface HarnessOptions {
  role?: string;
  userId?: number;
  /** Đường dẫn ban đầu của MemoryRouter. */
  path?: string;
  /** Pattern route để gắn `ui` (vd. '/team/:id'). Mặc định '*'. */
  routePath?: string;
  /** Tổ trong bootstrap (nguồn của `caps.canManageTeam`). */
  teams?: HarnessTeam[];
}

const LocationProbe = () => <div data-testid="path">{useLocation().pathname}</div>;

/** Dựng Query + Toast + Router với session và bootstrap giả để màn hình đọc quyền qua `useCapabilities()`. */
export function renderWithApp(ui: React.ReactElement, options: HarnessOptions = {}) {
  const { role = 'member', userId = 1, path = '/', routePath = '*', teams = [] } = options;
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  });
  qc.setQueryData(SESSION_KEY, {
    user: { id: userId, name: 'Tôi', email: 'toi@x.vn', role, phone: null, avatar_color: '#0052cc' },
    units: { current: null, memberships: [] },
  });
  qc.setQueryData(BOOTSTRAP_KEY, {
    stats: { activeActivities: 0, openTasks: 0, overdueTasks: 0, completedMonth: 0 },
    upcoming: [],
    tasks: [],
    activity: [],
    teams,
    capabilities: { canCreateActivity: false, canCreateAccount: false },
  });
  const utils = render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={routePath} element={ui} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
  return { qc, ...utils };
}
