import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UnitSwitcher } from './UnitSwitcher';
import { ToastProvider } from '../../../shared/components/Toast';
import { SESSION_KEY } from '../../queryKeys';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, switchUnit: vi.fn(), fetchSession: vi.fn(), fetchBootstrap: vi.fn().mockResolvedValue({ teams: [], capabilities: {} }) };
});

const memberships = [
  { unit_id: 1, code: 'TCKT', name: 'Ban TCKT', kind: 'board', role: 'member' },
  { unit_id: 2, code: 'K1', name: 'Khoa 1', kind: 'faculty', role: 'leader' },
];
const sessionAt = (unitId: number, list = memberships) => ({
  user: { id: 1, name: 'A', email: 'a@x', role: 'member' },
  units: { current: { id: unitId, code: '', name: list.find((m) => m.unit_id === unitId)?.name ?? '', kind: '' }, memberships: list },
});

const Probe = () => <div data-testid="path">{useLocation().pathname}</div>;

function setup(session: ReturnType<typeof sessionAt>) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  qc.setQueryData(SESSION_KEY, session);
  qc.setQueryData(['core-activities'], [{ id: 9 }]);
  render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/activities']}>
          <UnitSwitcher />
          <Routes><Route path="*" element={<Probe />} /></Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
  return qc;
}

describe('UnitSwitcher', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(cleanup);

  it('ẩn khi chỉ có một đơn vị', () => {
    setup(sessionAt(1, [memberships[0]]));
    expect(screen.queryByLabelText('Đơn vị')).toBeNull();
  });

  it('chưa có đơn vị hiện tại: hiện lựa chọn "Chọn đơn vị" bị vô hiệu, đang được chọn', () => {
    const noCurrent = { user: { id: 1, name: 'A', email: 'a@x', role: 'member' }, units: { current: null, memberships } };
    setup(noCurrent as unknown as ReturnType<typeof sessionAt>);
    const select = screen.getByLabelText('Đơn vị') as HTMLSelectElement;
    const placeholder = Array.from(select.options).find((o) => o.textContent === 'Chọn đơn vị')!;
    expect(placeholder.disabled).toBe(true);
    expect(select.value).toBe('');
  });

  it('đổi đơn vị: gọi API, cập nhật session, xoá cache khác, về Tổng quan', async () => {
    vi.mocked(api.switchUnit).mockResolvedValueOnce(sessionAt(2));
    const qc = setup(sessionAt(1));
    fireEvent.change(screen.getByLabelText('Đơn vị'), { target: { value: '2' } });
    await waitFor(() => expect(api.switchUnit).toHaveBeenCalledWith(2));
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/dashboard'));
    expect((qc.getQueryData(SESSION_KEY) as ReturnType<typeof sessionAt>).units.current.id).toBe(2);
    expect(qc.getQueryData(['core-activities'])).toBeUndefined();
  });

  it('đổi đơn vị: tải lại dữ liệu đang hiển thị ở màn đang mở', async () => {
    vi.mocked(api.switchUnit).mockResolvedValueOnce(sessionAt(2));
    const unitData = vi.fn().mockResolvedValueOnce('unit-1').mockResolvedValueOnce('unit-2');
    const Consumer = () => {
      const { data } = useQuery({ queryKey: ['unit-data'], queryFn: unitData });
      return <div data-testid="unit-data">{data ?? 'đang tải'}</div>;
    };
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    qc.setQueryData(SESSION_KEY, sessionAt(1));
    render(
      <QueryClientProvider client={qc}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <UnitSwitcher />
            <Consumer />
            <Routes><Route path="*" element={<Probe />} /></Routes>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );
    expect(await screen.findByText('unit-1')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Đơn vị'), { target: { value: '2' } });
    expect(await screen.findByText('unit-2')).toBeDefined();
    expect(unitData).toHaveBeenCalledTimes(2);
  });

  it('lỗi thì báo toast, giữ đơn vị và cache cũ', async () => {
    vi.mocked(api.switchUnit).mockRejectedValueOnce({ response: { status: 403, data: { error: 'Bạn không thuộc đơn vị này.' } } });
    const qc = setup(sessionAt(1));
    fireEvent.change(screen.getByLabelText('Đơn vị'), { target: { value: '2' } });
    expect(await screen.findByText('Bạn không thuộc đơn vị này.')).toBeDefined();
    expect((qc.getQueryData(SESSION_KEY) as ReturnType<typeof sessionAt>).units.current.id).toBe(1);
    expect(qc.getQueryData(['core-activities'])).toEqual([{ id: 9 }]);
    expect(screen.getByTestId('path').textContent).toBe('/activities');
  });
});
