import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, Button } from '../../../ui';
import { fetchTeams, updateActivity, type ActivityDetail, type UpdateActivityPayload } from '../../api';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { LinkField } from '../../../shared/components/LinkField';
import { ErrorText, FieldRow, NativeSelect } from './formBits';
import {
  EDIT_STATUS_OPTIONS,
  EDIT_TYPE_OPTIONS,
  buildUpdatePayload,
  effectiveTeamIds,
  initialEditForm,
  validateEditForm,
  type EditForm,
} from './editPayload';
import { useActivityMutation } from './useActivityMutation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  detail: ActivityDetail;
  /** Vai trò admin khi ghi: được sửa trạng thái và các Tổ tham gia. */
  isAdmin: boolean;
}

export const EditActivityModal: React.FC<Props> = ({ isOpen, onClose, detail, isAdmin }) => {
  const [initial, setInitial] = useState<EditForm>(() => initialEditForm(detail));
  const [form, setForm] = useState<EditForm>(initial);
  const [error, setError] = useState('');
  const [pendingCancel, setPendingCancel] = useState<UpdateActivityPayload | null>(null);

  // Chỉ nạp lại form khi mở modal; dữ liệu tải lại nền không được ghi đè phần đang sửa.
  useEffect(() => {
    if (isOpen) {
      const openingForm = initialEditForm(detail);
      setInitial(openingForm);
      setForm(openingForm);
      setError('');
      setPendingCancel(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const teamsQuery = useQuery({ queryKey: ['core-teams'], queryFn: fetchTeams, enabled: isOpen && isAdmin });

  const activeTeams = teamsQuery.data?.filter((t) => t.is_active !== 0 && t.is_active !== false).map((t) => ({ id: t.id, name: t.name })) ?? [];
  const activeIds = new Set(activeTeams.map((t) => t.id));
  const teamOptions = teamsQuery.data
    ? [...activeTeams, ...detail.activityTeams.filter((t) => !activeIds.has(t.team_id)).map((t) => ({ id: t.team_id, name: `${t.name} (đã lưu trữ)` }))]
    : detail.activityTeams.map((t) => ({ id: t.team_id, name: t.name }));

  const set = <K extends keyof EditForm>(key: K, value: EditForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const toggleTeam = (id: number) =>
    set('teamIds', form.teamIds.includes(id) ? form.teamIds.filter((x) => x !== id) : [...form.teamIds, id]);

  const save = useActivityMutation(
    detail.activity.id,
    (payload: UpdateActivityPayload) => updateActivity(detail.activity.id, payload),
    {
      message: 'Đã lưu thay đổi.',
      removedMessage: 'Đã huỷ hoạt động và xoá khỏi hệ thống.',
      removed: (result) => Boolean(result.deleted),
      onDone: onClose,
    }
  );

  const submit = () => {
    const message = validateEditForm(form);
    if (message) {
      setError(message);
      return;
    }
    setError('');
    const payload = buildUpdatePayload(form, initial, isAdmin);
    if (payload.status === 'cancelled') {
      setPendingCancel(payload);
      return;
    }
    save.mutate(payload);
  };

  const leadId = Number(form.leadTeamId);
  const activeTeamIds = effectiveTeamIds(form);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 'var(--ui-radius-sm, 4px)',
    border: '1px solid var(--ui-border)',
    background: 'var(--ui-bg-input, var(--ui-bg-card))',
    color: 'var(--ui-text)',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title="Sửa thông tin khác"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <Button onClick={onClose}>
              Huỷ
            </Button>
            <Button variant="primary" disabled={save.isPending} onClick={submit}>
              Lưu thay đổi
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <FieldRow label="Loại hoạt động" htmlFor="edit-activity-type">
            <NativeSelect id="edit-activity-type" value={form.type} options={EDIT_TYPE_OPTIONS} onChange={(v) => set('type', v)} />
          </FieldRow>
          <FieldRow label="Địa điểm" htmlFor="edit-activity-location">
            <input id="edit-activity-location" value={form.location} onChange={(e) => set('location', e.target.value)} style={inputStyle} />
          </FieldRow>
          {form.type === 'assigned' && (
            <FieldRow label="Yêu cầu bởi" htmlFor="edit-activity-requested">
              <input id="edit-activity-requested" value={form.requestedBy} onChange={(e) => set('requestedBy', e.target.value)} style={inputStyle} />
            </FieldRow>
          )}
          <FieldRow label="Kết quả" htmlFor="edit-activity-result">
            <textarea id="edit-activity-result" rows={2} value={form.resultSummary} onChange={(e) => set('resultSummary', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
          </FieldRow>
          <LinkField label="Link đề án (không bắt buộc)" value={form.proposalUrl} onChange={(v) => set('proposalUrl', v)} />
          <div style={{ margin: '4px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isPublic} onChange={(e) => set('isPublic', e.target.checked)} /> Hiển thị trên trang công khai
            </label>
          </div>
          <LinkField label="Link ảnh công khai (không bắt buộc)" value={form.publicImageUrl} onChange={(v) => set('publicImageUrl', v)} />

          {isAdmin && (
            <div style={{ marginTop: 8 }}>
              <FieldRow label="Trạng thái" htmlFor="edit-activity-status">
                <NativeSelect id="edit-activity-status" value={form.status} options={EDIT_STATUS_OPTIONS} onChange={(v) => set('status', v)} />
              </FieldRow>
              <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                <legend style={{ fontWeight: 600, marginBottom: 4, fontSize: '13px' }}>Các Tổ tham gia</legend>
                {teamOptions.map((t) => (
                  <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={activeTeamIds.includes(t.id)} disabled={t.id === leadId} onChange={() => toggleTeam(t.id)} /> {t.name}
                  </label>
                ))}
              </fieldset>
            </div>
          )}
          {error && <ErrorText>{error}</ErrorText>}
        </div>
      </Dialog>
      <ConfirmDialog
        isOpen={pendingCancel !== null}
        title="Huỷ và xoá hoạt động?"
        appearance="danger"
        confirmLabel="Huỷ và xoá hoạt động"
        isLoading={save.isPending}
        onCancel={() => setPendingCancel(null)}
        onConfirm={() => {
          if (pendingCancel) save.mutate(pendingCancel, { onSettled: () => setPendingCancel(null) });
        }}
      >
        Chuyển sang "Đã hủy" sẽ xoá vĩnh viễn hoạt động cùng các công việc của nó. Không thể hoàn tác.
      </ConfirmDialog>
    </>
  );
};
