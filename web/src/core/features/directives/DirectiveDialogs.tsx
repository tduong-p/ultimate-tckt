import React, { useEffect, useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import TextArea from '@atlaskit/textarea';
import { fetchActivities, fetchUnitMembers, type DirectiveDetail } from '../../api';
import { ErrorText, FormDialog, QueryStatus, SelectField } from '../dieuhanh/parts';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Quản trị viên', vice_admin: 'Phó quản trị viên', leader: 'Trưởng nhóm', vice_leader: 'Phó nhóm', member: 'Thành viên',
  btv_lead: 'Lãnh đạo BTV', btv_member: 'Thành viên BTV',
};

/** Tiếp nhận chỉ đạo, có thể chọn người phụ trách trong đơn vị mình (mặc định: người đang thao tác). */
export const AcknowledgeDialog: React.FC<{
  isOpen: boolean; unitId: number; defaultOwnerId: number | null; isLoading: boolean;
  onSubmit: (ownerUserId: number | undefined) => void; onCancel: () => void;
}> = ({ isOpen, unitId, defaultOwnerId, isLoading, onSubmit, onCancel }) => {
  const [owner, setOwner] = useState('');
  useEffect(() => { if (isOpen) setOwner(defaultOwnerId ? String(defaultOwnerId) : ''); }, [isOpen, defaultOwnerId]);
  const { data: members = [], isLoading: membersLoading, error: membersError, refetch: retryMembers } = useQuery({ queryKey: ['dieu-hanh-members', unitId], queryFn: () => fetchUnitMembers(unitId), enabled: isOpen });
  return (
    <FormDialog isOpen={isOpen} title="Tiếp nhận chỉ đạo" confirmLabel="Tiếp nhận" isLoading={isLoading}
      onSubmit={() => onSubmit(owner ? Number(owner) : undefined)} onCancel={onCancel}>
      <SelectField label="Người phụ trách" value={owner} onChange={setOwner} placeholder="Tôi (người tiếp nhận)" disabled={membersLoading || Boolean(membersError)}
        options={members.map((m) => ({ value: String(m.user_id), label: `${m.name} (${ROLE_LABEL[m.role] ?? 'Thành viên'})` }))} />
      <QueryStatus isLoading={membersLoading} error={membersError} onRetry={() => void retryMembers()} />
    </FormDialog>
  );
};

/** Gắn một hoạt động của đơn vị mình vào chỉ đạo (chưa huỷ, chưa gắn). */
export const LinkActivityDialog: React.FC<{
  isOpen: boolean; directive: DirectiveDetail; isLoading: boolean; onSubmit: (activityId: number) => void; onCancel: () => void;
}> = ({ isOpen, directive, isLoading, onSubmit, onCancel }) => {
  const [activityId, setActivityId] = useState('');
  useEffect(() => { if (!isOpen) setActivityId(''); }, [isOpen]);
  const { data: activities = [], isLoading: activitiesLoading, error: activitiesError, refetch } = useQuery({ queryKey: ['dieu-hanh-activities'], queryFn: () => fetchActivities(), enabled: isOpen });
  const linked = new Set(directive.activities.map((a) => a.id));
  const options = activities
    .filter((a) => a.unit_id === directive.to_unit_id && a.status !== 'cancelled' && a.directive_id == null && !linked.has(a.id))
    .map((a) => ({ value: String(a.id), label: a.title }));
  return (
    <FormDialog isOpen={isOpen} title="Gắn hoạt động vào chỉ đạo" confirmLabel="Gắn" isLoading={isLoading}
      confirmDisabled={!activityId || activitiesLoading || Boolean(activitiesError)} onSubmit={() => onSubmit(Number(activityId))} onCancel={onCancel}>
      <SelectField label="Hoạt động" required value={activityId} onChange={setActivityId} options={options} placeholder="Chọn hoạt động" disabled={activitiesLoading || Boolean(activitiesError)} />
      <QueryStatus isLoading={activitiesLoading} error={activitiesError} onRetry={() => void refetch()} />
    </FormDialog>
  );
};

/** Nộp kết quả: nguồn là một hoạt động đã gắn với chỉ đạo (ops_log/báo cáo chưa có để chọn). */
export const SubmitResultDialog: React.FC<{
  isOpen: boolean; directive: DirectiveDetail; isLoading: boolean;
  onSubmit: (payload: { source_type: 'activity'; source_id: number; note?: string }) => void; onCancel: () => void;
}> = ({ isOpen, directive, isLoading, onSubmit, onCancel }) => {
  const noteId = useId();
  const [source, setSource] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => {
    if (isOpen) { setSource(directive.activities.length === 1 ? String(directive.activities[0].id) : ''); setNote(''); }
  }, [isOpen, directive.activities]);
  const empty = directive.activities.length === 0;
  return (
    <FormDialog isOpen={isOpen} title="Nộp kết quả chỉ đạo" confirmLabel="Nộp" isLoading={isLoading} confirmDisabled={empty || !source}
      onSubmit={() => onSubmit({ source_type: 'activity', source_id: Number(source), note: note.trim() || undefined })} onCancel={onCancel}>
      {empty && <ErrorText message="Hãy gắn ít nhất một hoạt động trước." />}
      <SelectField label="Hoạt động làm kết quả" required value={source} onChange={setSource} disabled={empty}
        options={directive.activities.map((a) => ({ value: String(a.id), label: a.title }))} placeholder="Chọn hoạt động" />
      <div style={{ marginTop: 12 }}>
        <label htmlFor={noteId}>Ghi chú</label>
        <TextArea id={noteId} value={note} minimumRows={3} onChange={(e) => setNote(e.target.value)} />
      </div>
    </FormDialog>
  );
};
