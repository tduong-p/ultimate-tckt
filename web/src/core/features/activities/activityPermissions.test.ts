import { describe, it, expect } from 'vitest';
import { deriveActivityActions } from './activityPermissions';
import { makeDetail } from './testUtils';

const detail = (status: string, canManage: boolean, participants = makeDetail().participants) =>
  makeDetail({ activity: { status }, canManage, participants });

describe('deriveActivityActions', () => {
  it('admin duyệt/xoá/sửa khi đề án chờ duyệt', () => {
    const a = deriveActivityActions({ canWrite: true, canManageWrite: true, isWriteExec: true, userId: 1, detail: detail('proposed', true) });
    expect(a).toMatchObject({ canApprove: true, canEdit: true, canEditAdminFields: true, canDelete: true, canAddParticipants: true });
    expect(a.canResubmit).toBe(false);
  });

  it('admin không duyệt khi không còn ở trạng thái proposed', () => {
    expect(deriveActivityActions({ canWrite: true, canManageWrite: true, isWriteExec: true, userId: 1, detail: detail('approved', true) }).canApprove).toBe(false);
  });

  it('Tổ trưởng (canManage, không admin): sửa được, không duyệt/xoá/sửa trường admin', () => {
    const a = deriveActivityActions({ canWrite: true, canManageWrite: true, isWriteExec: false, userId: 2, detail: detail('proposed', true) });
    expect(a).toMatchObject({ canApprove: false, canDelete: false, canEditAdminFields: false, canEdit: true, canAddParticipants: true });
  });

  it('nộp lại chỉ khi changes_requested và canManage', () => {
    expect(deriveActivityActions({ canWrite: true, canManageWrite: true, isWriteExec: false, userId: 2, detail: detail('changes_requested', true) }).canResubmit).toBe(true);
    expect(deriveActivityActions({ canWrite: true, canManageWrite: false, isWriteExec: false, userId: 2, detail: detail('changes_requested', false) }).canResubmit).toBe(false);
    expect(deriveActivityActions({ canWrite: true, canManageWrite: true, isWriteExec: false, userId: 2, detail: detail('proposed', true) }).canResubmit).toBe(false);
  });

  it('tạo việc: người quản lý hoạt động được, thành viên thường và người chỉ-xem thì không', () => {
    expect(deriveActivityActions({ canWrite: true, canManageWrite: true, isWriteExec: false, userId: 2, detail: detail('active', true) }).canCreateTask).toBe(true);
    expect(deriveActivityActions({ canWrite: true, canManageWrite: false, isWriteExec: true, userId: 1, detail: detail('active', false) }).canCreateTask).toBe(true);
    expect(deriveActivityActions({ canWrite: true, canManageWrite: false, isWriteExec: false, userId: 3, detail: detail('active', false) }).canCreateTask).toBe(false);
    expect(deriveActivityActions({ canWrite: false, canManageWrite: true, isWriteExec: true, userId: 1, detail: detail('active', true) }).canCreateTask).toBe(false);
  });

  it('thành viên thường không sửa, không thêm người', () => {
    const a = deriveActivityActions({ canWrite: true, canManageWrite: false, isWriteExec: false, userId: 3, detail: detail('active', false) });
    expect(a).toMatchObject({ canEdit: false, canAddParticipants: false, canApprove: false, canDelete: false });
  });

  it('đăng ký tham gia: hiện khi chưa có dòng hoặc đã từ chối, ẩn khi đã đăng ký/xác nhận', () => {
    const row = (state: string) => [{ user_id: 3, state, name: 'A' }];
    expect(deriveActivityActions({ canWrite: true, canManageWrite: false, isWriteExec: false, userId: 3, detail: detail('active', false, []) }).canVolunteer).toBe(true);
    expect(deriveActivityActions({ canWrite: true, canManageWrite: false, isWriteExec: false, userId: 3, detail: detail('active', false, row('declined')) }).canVolunteer).toBe(true);
    expect(deriveActivityActions({ canWrite: true, canManageWrite: false, isWriteExec: false, userId: 3, detail: detail('active', false, row('volunteered')) }).canVolunteer).toBe(false);
    expect(deriveActivityActions({ canWrite: true, canManageWrite: false, isWriteExec: false, userId: 3, detail: detail('active', false, row('confirmed')) }).canVolunteer).toBe(false);
    expect(deriveActivityActions({ canWrite: true, canManageWrite: true, isWriteExec: false, userId: null, detail: detail('active', false, []) }).canVolunteer).toBe(false);
  });
});
