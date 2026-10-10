// web/src/core/features/activities/ActivityDetailView.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, EditBar } from '../../../ui';
import { apiErrorMessage, fetchActivityDetail } from '../../api';
import { useCapabilities } from '../../capabilities';
import { patchActivityBatch } from '../../edit/editApi';
import { useEditGuard } from '../../edit/EditGuard';
import { useEditSession } from '../../edit/useEditSession';
import { useToast } from '../../../shared/components/Toast';
import { activityDetailKey, invalidateActivity } from './activityKeys';
import { ACTIVITY_FIELD_LABELS, describeActivityFields } from './activityLabels';
import { REQUIRED_FIELDS, toDraftOriginal, type ActivityDetailData, type ActivityDraftFields } from './activityEdit';
import { ActivityPlanSection } from './ActivityPlanSection';
import { ActivityActions } from './ActivityActions';
import { ActivityTaskActions } from '../tasks/ActivityTaskActions';
import { ActivityUpdatesSection } from './ActivityUpdatesSection';
import { ActivityProperties, ActivityTitleBlock } from './ActivityHeader';
import { ActivityDetailsCard, ActivityParticipantsCard, ActivityTeamsCard, ProposalHistoryCard } from './ActivityInfoSections';
import './activities.css';

const BackLink: React.FC = () => (
  <a href="#/activities" className="act-back">
    ← Danh sách hoạt động
  </a>
);

const NOT_FOUND_MESSAGE = 'Không tìm thấy hoạt động hoặc bạn không có quyền xem.';
const NO_FIELDS: string[] = [];
const EMPTY_DRAFT: ActivityDraftFields = { title: '', description: '', priority: 'medium', start_date: '', deadline: '', team_id: 0, event_lead_id: null };
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Trường bắt buộc đang trống (đã có trong nháp). */
type Notice = { kind: 'error'; message: string } | { kind: 'conflict'; fields: string[] };

/** Trang `#activity/:id`. Phiên sửa tại chỗ nằm ở đây (component route-level) để EditGuard giữ được nháp. */
export const ActivityDetailView: React.FC = () => {
  const { canWriteActivities } = useCapabilities();
  const qc = useQueryClient();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const activityId = Number(id);
  const validId = Number.isInteger(activityId) && activityId > 0;
  const { data, isLoading, error } = useQuery({
    queryKey: activityDetailKey(activityId),
    queryFn: () => fetchActivityDetail(activityId) as Promise<ActivityDetailData>,
    enabled: validId,
  });
  const dataRef = useRef(data);
  dataRef.current = data;

  // DYC chỉ đọc (INV-AUTH-001): không tin riêng `editable[]` khi người dùng không có quyền ghi hoạt động.
  const editableList = canWriteActivities ? (data?.editable ?? NO_FIELDS) : NO_FIELDS;
  const editable = useMemo(() => new Set(editableList), [editableList]);
  const original = useMemo(() => (data ? toDraftOriginal(data.activity) : EMPTY_DRAFT), [data]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [invalid, setInvalid] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  const session = useEditSession<ActivityDraftFields>({
    original,
    editable: editableList,
    patch: (changes, base) => patchActivityBatch(activityId, { changes, base }),
    onSaved: () => invalidateActivity(qc, activityId),
  });
  // Gõ lại nội dung thì bỏ cờ trống của trường đó.
  useEffect(() => {
    setInvalid((cur) => {
      const next = cur.filter((k) => !String(session.value(k as keyof ActivityDraftFields) ?? '').trim());
      return next.length === cur.length ? cur : next;
    });
  }, [session]);
  useEditGuard(session.dirty);

  // Đổi sang hoạt động khác: bỏ nháp của hoạt động cũ.
  const { discard } = session;
  useEffect(() => {
    discard();
    setNotice(null);
    setInvalid([]);
  }, [activityId, discard]);

  /** Tải lại chi tiết và chờ tới khi `original` mới đã được render (base của lần lưu sau phải là bản mới). */
  const refreshOriginal = async () => {
    const fresh = await qc.fetchQuery({ queryKey: activityDetailKey(activityId), queryFn: () => fetchActivityDetail(activityId), staleTime: 0 });
    for (let i = 0; i < 40 && dataRef.current !== fresh; i += 1) await sleep(5);
    await sleep(0);
  };

  const save = async () => {
    const blanks = REQUIRED_FIELDS.filter((k) => session.changedKeys.includes(k) && !String(session.value(k) ?? '').trim());
    if (blanks.length) {
      setInvalid(blanks);
      setNotice({ kind: 'error', message: `${ACTIVITY_FIELD_LABELS[blanks[0]]} không được để trống.` });
      rootRef.current?.querySelector<HTMLElement>(`[data-edit-field="${blanks[0]}"]`)?.focus();
      return;
    }
    setInvalid([]);
    setNotice(null);
    const result = await session.save();
    if (result.ok) {
      toast.success('Đã lưu');
      return;
    }
    if (result.kind === 'conflict') {
      setNotice({ kind: 'conflict', fields: result.fields ?? [] });
      void invalidateActivity(qc, activityId);
      return;
    }
    if (result.kind === 'forbidden' && result.fields?.length) {
      setNotice({ kind: 'error', message: `Bạn không có quyền sửa: ${describeActivityFields(result.fields)}.` });
      return;
    }
    setNotice({ kind: 'error', message: result.message });
  };

  const takeTheirs = async () => {
    session.discard();
    setNotice(null);
    await refreshOriginal();
  };
  const keepMine = async () => {
    setNotice(null);
    await refreshOriginal();
    await save();
  };

  if (validId && isLoading) return <p className="act-state" role="status">Đang tải hoạt động...</p>;

  if (!validId || !data) {
    const notFound = !validId || (error as { response?: { status?: number } } | null)?.response?.status === 404;
    return (
      <div className="act">
        <BackLink />
        <div role="alert" className="act-state act-state--error">
          {notFound ? NOT_FOUND_MESSAGE : apiErrorMessage(error, 'Không tải được hoạt động. Vui lòng thử lại.')}
        </div>
      </div>
    );
  }

  const { activity } = data;
  return (
    <div className="act" ref={rootRef}>
      <BackLink />
      <ActivityTitleBlock activity={activity} session={session} editable={editable} invalid={invalid} />
      <div className="act-bar">
        <ActivityActions detail={data} />
        <ActivityTaskActions
          activityId={activity.id}
          activityType={activity.type}
          activityStatus={activity.status}
          canManage={data.canManage}
          activityTeams={data.activityTeams.map((t) => ({ team_id: t.team_id, name: t.name, color: t.color }))}
        />
      </div>
      <div className="act-cols">
        <div className="act-main">
          <ActivityProperties activity={activity} teams={data.activityTeams} session={session} editable={editable} invalid={invalid} />
          <ActivityPlanSection tasks={data.tasks} attachments={data.attachments} activityType={activity.type} canManage={data.canManage} />
          <ActivityUpdatesSection activityId={activity.id} updates={data.updates} taggablePeople={data.taggablePeople} canWrite={canWriteActivities} />
        </div>
        <aside className="act-side">
          <ActivityTeamsCard teams={data.activityTeams} />
          <ActivityParticipantsCard participants={data.participants} />
          <ActivityDetailsCard activity={activity} />
          <ProposalHistoryCard history={data.proposalHistory} />
        </aside>
      </div>
      {notice?.kind === 'conflict' && (
        <div className="act-notice" role="alert">
          <span>
            {`Hoạt động đã bị người khác sửa${notice.fields.length ? ` (${describeActivityFields(notice.fields)})` : ''}. Bản mới nhất đã được tải về.`}
          </span>
          <span className="act-notice-actions">
            <Button onClick={() => void takeTheirs()}>Lấy bản mới</Button>
            <Button variant="primary" onClick={() => void keepMine()}>Giữ của tôi</Button>
          </span>
        </div>
      )}
      <EditBar
        dirty={session.dirty}
        count={session.changedKeys.length}
        saving={session.saving}
        onSave={() => void save()}
        saveDisabled={notice?.kind === 'conflict'}
        onDiscard={() => { session.discard(); setNotice(null); setInvalid([]); }}
        error={notice?.kind === 'error' ? notice.message : undefined}
      />
    </div>
  );
};
