import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { deriveCapabilities, useCapabilities } from './capabilities';
import { SESSION_KEY, BOOTSTRAP_KEY } from './queryKeys';
import type { BootstrapData, SessionData } from './api';

const session = (role: string, unitRole?: string): SessionData => ({
  user: { id: 1, name: 'A', email: 'a@hust.edu.vn', role },
  units: {
    current: { id: 2, code: 'K1', name: 'Khoa 1', kind: 'faculty' },
    memberships: unitRole ? [{ unit_id: 2, code: 'K1', name: 'Khoa 1', kind: 'faculty', role: unitRole }] : [],
  },
});

const bootstrap = (teams: BootstrapData['teams'] = []): BootstrapData => ({
  stats: { activeActivities: 0, openTasks: 0, overdueTasks: 0, completedMonth: 0 },
  upcoming: [], tasks: [], activity: [], teams,
  capabilities: { canCreateActivity: true, canCreateAccount: false },
});

describe('deriveCapabilities', () => {
  it('chưa có dữ liệu thì không có quyền gì', () => {
    const c = deriveCapabilities(undefined, undefined);
    expect(c.isExec).toBe(false);
    expect(c.isManager).toBe(false);
    expect(c.canManageTeam(1)).toBe(false);
    expect(c.memberships).toEqual([]);
  });

  it('admin là exec và manager, quản lý mọi Tổ', () => {
    const c = deriveCapabilities(session('admin'), bootstrap());
    expect(c.isExec).toBe(true);
    expect(c.isManager).toBe(true);
    expect(c.canManageTeam(99)).toBe(true);
  });

  it('vai trò đơn vị hiện tại cũng tính như server (role member nhưng unitRole leader)', () => {
    const c = deriveCapabilities(session('member', 'leader'), bootstrap());
    expect(c.unitRole).toBe('leader');
    expect(c.isManager).toBe(true);
    expect(c.isExec).toBe(false);
  });

  it('Tổ trưởng chỉ quản lý Tổ có can_manage', () => {
    const c = deriveCapabilities(session('leader'), bootstrap([
      { id: 1, name: 'Tổ 1', can_manage: 1 },
      { id: 2, name: 'Tổ 2', can_manage: 0 },
    ]));
    expect(c.canManageTeam(1)).toBe(true);
    expect(c.canManageTeam(2)).toBe(false);
  });

  it('canManageTeam theo luật server: leader/vice_leader và can_manage; member có can_manage thì không', () => {
    const teams = [{ id: 1, name: 'Tổ 1', can_manage: 1 }];
    expect(deriveCapabilities(session('vice_leader'), bootstrap(teams)).canManageTeam(1)).toBe(true);
    expect(deriveCapabilities(session('member', 'leader'), bootstrap(teams)).canManageTeam(1)).toBe(true);
    expect(deriveCapabilities(session('member'), bootstrap(teams)).canManageTeam(1)).toBe(false);
  });

  it('thành viên thường không phải manager', () => {
    const c = deriveCapabilities(session('member'), bootstrap());
    expect(c.isManager).toBe(false);
    expect(c.canCreateActivity).toBe(true); // lấy nguyên từ bootstrap
  });
});

describe('useCapabilities', () => {
  it('đọc session và bootstrap từ cache', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    qc.setQueryData(SESSION_KEY, session('vice_admin'));
    qc.setQueryData(BOOTSTRAP_KEY, bootstrap());
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCapabilities(), { wrapper });
    expect(result.current.isExec).toBe(true);
    expect(result.current.unit?.code).toBe('K1');
  });
});
