import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { DirectivesView } from './DirectivesView';
import { BTV_UNIT, renderDh, TCKT_UNIT } from '../dieuhanh/testUtils';
import * as api from '../../api';

vi.mock('../../api', async () => {
  const actual = await vi.importActual<typeof import('../../api')>('../../api');
  return { ...actual, fetchDirectives: vi.fn(), fetchDieuHanhUnits: vi.fn(), createDirective: vi.fn() };
});

const row = (over: Partial<api.Directive> = {}): api.Directive => ({
  id: 7, from_unit_id: 1, to_unit_id: 2, title: 'Báo cáo quý IV', body: null, deadline: '2026-12-01', status: 'sent',
  created_by: 9, owner_user_id: null, acknowledged_at: null, created_at: '2026-10-01T03:00:00.000Z', updated_at: '',
  from_unit_name: 'Ban Thường vụ', to_unit_name: 'Ban TCKT', ...over,
});

describe('DirectivesView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchDirectives).mockResolvedValue([
      row(),
      row({ id: 8, title: 'Việc đơn vị mình gửi', from_unit_id: 2, to_unit_id: 3, from_unit_name: 'Ban TCKT', to_unit_name: 'Ban khác', status: 'accepted' }),
    ]);
    vi.mocked(api.fetchDieuHanhUnits).mockResolvedValue([
      { id: 1, code: 'BTV', name: 'Ban Thường vụ', kind: 'standing_committee' },
      { id: 2, code: 'TCKT', name: 'Ban TCKT', kind: 'department' },
    ]);
  });
  afterEach(() => {
    cleanup();
  });

  it('liệt kê chỉ đạo với đơn vị gửi/nhận, hạn và trạng thái; tiêu đề dẫn tới trang chi tiết', async () => {
    renderDh(<DirectivesView />, { path: '/directives' });
    const link = await screen.findByRole('link', { name: 'Báo cáo quý IV' });
    expect(link.getAttribute('href')).toBe('/directive/7');
    const tr = link.closest('tr') as HTMLElement;
    expect(within(tr).getByText('Ban Thường vụ')).toBeDefined();
    expect(within(tr).getByText('01/12/2026')).toBeDefined();
    expect(within(tr).getByText('Đã gửi')).toBeDefined();
  });

  it('lọc theo hướng: "Nhận về" chỉ còn chỉ đạo gửi tới đơn vị hiện tại', async () => {
    renderDh(<DirectivesView />, { path: '/directives' });
    await screen.findByText('Báo cáo quý IV');
    fireEvent.change(screen.getByLabelText('Hướng'), { target: { value: 'received' } });
    expect(screen.getByText('Báo cáo quý IV')).toBeDefined();
    expect(screen.queryByText('Việc đơn vị mình gửi')).toBeNull();
  });

  it('nút "Giao việc mới" ẩn với TCKT admin, hiện với BTV', async () => {
    renderDh(<DirectivesView />, { path: '/directives', unit: TCKT_UNIT, role: 'admin' });
    await screen.findByText('Báo cáo quý IV');
    expect(screen.queryByRole('button', { name: 'Giao việc mới' })).toBeNull();
    cleanup();
    renderDh(<DirectivesView />, { path: '/directives', unit: BTV_UNIT, role: 'btv_lead' });
    expect(await screen.findByRole('button', { name: 'Giao việc mới' })).toBeDefined();
  });

  it('BTV tạo chỉ đạo: gửi đúng body, làm mới danh sách, chuyển tới trang chi tiết', async () => {
    vi.mocked(api.createDirective).mockResolvedValueOnce(row({ id: 21 }));
    const { qc } = renderDh(<DirectivesView />, { path: '/directives', unit: BTV_UNIT, role: 'btv_lead' });
    await screen.findByText('Báo cáo quý IV');
    fireEvent.click(screen.getByRole('button', { name: 'Giao việc mới' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('option', { name: 'Ban TCKT' });
    // Đơn vị hiện tại (BTV) không nằm trong danh sách nhận
    expect(within(dialog).queryByRole('option', { name: 'Ban Thường vụ' })).toBeNull();
    fireEvent.change(within(dialog).getByLabelText(/Đơn vị nhận/), { target: { value: '2' } });
    fireEvent.change(within(dialog).getByLabelText(/Tiêu đề/), { target: { value: '  Tổng kết năm  ' } });
    fireEvent.change(within(dialog).getByLabelText(/Nội dung/), { target: { value: 'Nộp trước hạn' } });
    fireEvent.change(within(dialog).getByLabelText(/Hạn hoàn thành/), { target: { value: '2026-12-31' } });
    const spy = vi.spyOn(qc, 'invalidateQueries');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Giao việc' }));
    await waitFor(() => expect(api.createDirective).toHaveBeenCalledWith(
      expect.objectContaining({ to_unit_id: 2, title: 'Tổng kết năm', body: 'Nộp trước hạn', deadline: '2026-12-31' }),
      expect.anything()
    ));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['directives'] }));
  });

  it('thiếu trường bắt buộc thì không gọi API và báo lỗi', async () => {
    renderDh(<DirectivesView />, { path: '/directives', unit: BTV_UNIT, role: 'btv_lead' });
    fireEvent.click(await screen.findByRole('button', { name: 'Giao việc mới' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Giao việc' }));
    expect(within(dialog).getByText('Chọn đơn vị nhận, nhập tiêu đề và hạn hoàn thành.')).toBeDefined();
    expect(api.createDirective).not.toHaveBeenCalled();
  });

  it('lỗi server hiện bằng tiếng Việt trong hộp thoại', async () => {
    vi.mocked(api.createDirective).mockRejectedValueOnce({ response: { status: 403, data: { error: 'Chỉ BTV mới có quyền tạo chỉ đạo.' } } });
    renderDh(<DirectivesView />, { path: '/directives', unit: BTV_UNIT, role: 'btv_lead' });
    fireEvent.click(await screen.findByRole('button', { name: 'Giao việc mới' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('option', { name: 'Ban TCKT' });
    fireEvent.change(within(dialog).getByLabelText(/Đơn vị nhận/), { target: { value: '2' } });
    fireEvent.change(within(dialog).getByLabelText(/Tiêu đề/), { target: { value: 'X' } });
    fireEvent.change(within(dialog).getByLabelText(/Hạn hoàn thành/), { target: { value: '2026-12-31' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Giao việc' }));
    expect(await within(dialog).findByText('Chỉ BTV mới có quyền tạo chỉ đạo.')).toBeDefined();
  });

  it('403 Forbidden của danh sách hiện thông báo module', async () => {
    vi.mocked(api.fetchDirectives).mockRejectedValue({ response: { status: 403, data: { error: 'Forbidden' } } });
    renderDh(<DirectivesView />, { path: '/directives' });
    expect(await screen.findByText('Đơn vị hiện tại chưa bật module Điều hành.')).toBeDefined();
  });
});
