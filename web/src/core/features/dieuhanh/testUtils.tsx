import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../../../shared/components/Toast';
import { BOOTSTRAP_KEY, SESSION_KEY } from '../../queryKeys';

export interface TestUnit { id: number; code: string; name: string; kind: string; modules?: string[] }
export const TCKT_UNIT: TestUnit = { id: 2, code: 'TCKT', name: 'Ban TCKT', kind: 'department', modules: ['dieu-hanh', 'ctd'] };
export const BTV_UNIT: TestUnit = { id: 1, code: 'BTV', name: 'Ban Thường vụ', kind: 'standing_committee', modules: ['dieu-hanh'] };

export interface DhTestOptions {
  path: string;
  /** Mẫu route của `ui` (mặc định mọi đường dẫn). */
  route?: string;
  unit?: TestUnit;
  /** Vai trò đơn vị (membership.role). */
  role?: string;
  userId?: number;
}

/** Render một màn của Giao việc/Trình với session + bootstrap đã nạp sẵn, router và toast. */
export function renderDh(ui: React.ReactElement, { path, route = '*', unit = TCKT_UNIT, role = 'admin', userId = 5 }: DhTestOptions) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  qc.setQueryData(SESSION_KEY, {
    user: { id: userId, name: 'Tôi', email: 't@x', role: 'member' },
    units: { current: unit, memberships: [{ unit_id: unit.id, code: unit.code, name: unit.name, kind: unit.kind, role }] },
  });
  qc.setQueryData(BOOTSTRAP_KEY, { stats: {}, upcoming: [], tasks: [], activity: [], teams: [], capabilities: { canCreateActivity: false, canCreateAccount: false } });
  const utils = render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes><Route path={route} element={ui} /></Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
  return { qc, ...utils };
}
