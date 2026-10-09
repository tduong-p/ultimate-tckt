import React, { useEffect, useMemo, useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { useQuery } from '@tanstack/react-query';
import { fetchMembers, fetchTeams, updateActivity, type ActivityDetail, type UpdateActivityPayload } from '../../api';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { LinkField } from '../../../shared/components/LinkField';
import { DateInput, ErrorText, FieldRow, NativeSelect } from './formBits';
import {
  EDIT_PRIORITY_OPTIONS,
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
  /** isExec: được sửa trạng thái, Trưởng BTC, Tổ. */
  isAdmin: boolean;
}

export const EditActivityModal: React.FC<Props> = ({ isOpen, onClose, detail, isAdmin }) => {
  const initial = useMemo(() => initialEditForm(detail), [detail]);
  const [form, setForm] = useState<EditForm>(initial);
  const [error, setError] = useState('');
  const [pendingCancel, setPendingCancel] = useState<UpdateActivityPayload | null>(null);

  // Chỉ nạp lại form khi mở modal; dữ liệu tải lại nền không được ghi đè phần đang sửa.
  useEffect(() => {
    if (isOpen) {
      setForm(initial);
      setError('');
      setPendingCancel(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const teamsQuery = useQuery({ queryKey: ['core-teams'], queryFn: fetchTeams, enabled: isOpen && isAdmin });
  const membersQuery = useQuery({ queryKey: ['core-members'], queryFn: fetchMembers, enabled: isOpen && isAdmin });

  const teamOptions = (
    teamsQuery.data?.filter((t) => t.is_active !== 0 && t.is_active !== false).map((t) => ({ id: t.id, name: t.name })) ??
    detail.activityTeams.map((t) => ({ id: t.team_id, name: t.name }))
  );
  const leadOptions = [{ value: '', label: 'Không có' }].concat(
    (membersQuery.data ?? []).filter((m) => m.is_active !== 0 && m.is_active !== false).map((m) => ({ value: String(m.id), label: m.name }))
  );
  if (form.eventLeadId && !leadOptions.some((o) => o.value === form.eventLeadId)) {
    leadOptions.push({ value: form.eventLeadId, label: detail.activity.event_lead_name ?? `Người dùng #${form.eventLeadId}` });
  }

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
    const message = validateEditForm(form, isAdmin);
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

  return (
    <>
      <ModalTransition>
        {isOpen && (
          <Modal onClose={onClose} width="large">
            <ModalHeader>
              <ModalTitle>Sửa hoạt động</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <FieldRow label="Tiêu đề" htmlFor="edit-activity-title">
                <Textfield id="edit-activity-title" value={form.title} onChange={(e) => set('title', (e.target as HTMLInputElement).value)} />
              </FieldRow>
              <FieldRow label="Mô tả" htmlFor="edit-activity-description">
                <TextArea id="edit-activity-description" minimumRows={3} value={form.description} onChange={(e) => set('description', (e.target as HTMLTextAreaElement).value)} />
              </FieldRow>
              <FieldRow label="Loại hoạt động" htmlFor="edit-activity-type">
                <NativeSelect id="edit-activity-type" value={form.type} options={EDIT_TYPE_OPTIONS} onChange={(v) => set('type', v)} />
              </FieldRow>
              <FieldRow label="Mức ưu tiên" htmlFor="edit-activity-priority">
                <NativeSelect id="edit-activity-priority" value={form.priority} options={EDIT_PRIORITY_OPTIONS} onChange={(v) => set('priority', v)} />
              </FieldRow>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <FieldRow label="Ngày bắt đầu" htmlFor="edit-activity-start">
                    <DateInput id="edit-activity-start" value={form.startDate} onChange={(v) => set('startDate', v)} />
                  </FieldRow>
                </div>
                <div style={{ flex: '1 1 200px' }}>
                  <FieldRow label="Hạn chót" htmlFor="edit-activity-deadline">
                    <DateInput id="edit-activity-deadline" value={form.deadline} onChange={(v) => set('deadline', v)} />
                  </FieldRow>
                </div>
              </div>
              <FieldRow label="Địa điểm" htmlFor="edit-activity-location">
                <Textfield id="edit-activity-location" value={form.location} onChange={(e) => set('location', (e.target as HTMLInputElement).value)} />
              </FieldRow>
              {form.type === 'assigned' && (
                <FieldRow label="Yêu cầu bởi" htmlFor="edit-activity-requested">
                  <Textfield id="edit-activity-requested" value={form.requestedBy} onChange={(e) => set('requestedBy', (e.target as HTMLInputElement).value)} />
                </FieldRow>
              )}
              <FieldRow label="Kết quả" htmlFor="edit-activity-result">
                <TextArea id="edit-activity-result" minimumRows={2} value={form.resultSummary} onChange={(e) => set('resultSummary', (e.target as HTMLTextAreaElement).value)} />
              </FieldRow>
              <LinkField label="Link đề án (không bắt buộc)" value={form.proposalUrl} onChange={(v) => set('proposalUrl', v)} />
              <div style={{ margin: '12px 0' }}>
                <label>
                  <input type="checkbox" checked={form.isPublic} onChange={(e) => set('isPublic', e.target.checked)} /> Hiển thị trên trang công khai
                </label>
              </div>
              {form.isPublic && <LinkField label="Link ảnh công khai (không bắt buộc)" value={form.publicImageUrl} onChange={(v) => set('publicImageUrl', v)} />}

              {isAdmin && (
                <div style={{ marginTop: 16 }}>
                  <FieldRow label="Trạng thái" htmlFor="edit-activity-status">
                    <NativeSelect id="edit-activity-status" value={form.status} options={EDIT_STATUS_OPTIONS} onChange={(v) => set('status', v)} />
                  </FieldRow>
                  <FieldRow label="Trưởng Ban Tổ chức" htmlFor="edit-activity-lead">
                    <NativeSelect id="edit-activity-lead" value={form.eventLeadId} options={leadOptions} onChange={(v) => set('eventLeadId', v)} />
                  </FieldRow>
                  <FieldRow label="Tổ chủ trì" htmlFor="edit-activity-lead-team">
                    <NativeSelect
                      id="edit-activity-lead-team"
                      value={form.leadTeamId}
                      options={[{ value: '', label: 'Chọn Tổ chủ trì' }, ...teamOptions.map((t) => ({ value: String(t.id), label: t.name }))]}
                      onChange={(v) => set('leadTeamId', v)}
                    />
                  </FieldRow>
                  <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                    <legend style={{ fontWeight: 600, marginBottom: 4 }}>Các Tổ tham gia</legend>
                    {teamOptions.map((t) => (
                      <label key={t.id} style={{ display: 'block', padding: '2px 0' }}>
                        <input type="checkbox" checked={activeTeamIds.includes(t.id)} disabled={t.id === leadId} onChange={() => toggleTeam(t.id)} /> {t.name}
                      </label>
                    ))}
                  </fieldset>
                </div>
              )}
              {error && <ErrorText>{error}</ErrorText>}
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={onClose}>
                Huỷ
              </Button>
              <Button appearance="primary" isLoading={save.isPending} onClick={submit}>
                Lưu thay đổi
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>
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
