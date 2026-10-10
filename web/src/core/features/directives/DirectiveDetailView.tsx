import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../ui';
import {
  acknowledgeDirective, apiErrorMessage, fetchDirective, linkDirectiveActivity, respondDirective, submitDirectiveResult,
} from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { formatVnDate } from '../../../shared/utils/date';
import { DIRECTIVE_KEY, DIRECTIVES_KEY, SUBMISSIONS_KEY } from '../dieuhanh/queryKeys';
import { useDhActor } from '../dieuhanh/useDhActor';
import { getActivityStatusMeta } from '../activities/activityLabels';
import {
  canAcknowledgeDirective, canLinkActivity, canRespondDirective, canSubmitDirective,
} from '../dieuhanh/permissions';
import { directiveStatus, sourceText, submissionStatus } from '../dieuhanh/labels';
import { ErrorLine, ReasonFormDialog, StatusBadge } from './dirKit';
import './directives.css';
import { AcknowledgeDialog, LinkActivityDialog, SubmitResultDialog } from './DirectiveDialogs';

type Dialog = null | 'ack' | 'link' | 'submit' | 'accept' | 'revise';

const Info: React.FC<{ label: string; children: React.ReactNode; wide?: boolean }> = ({ label, children, wide }) => (
  <div className={wide ? 'dir-body' : undefined}>
    <div className="dir-info-item-label">{label}</div>
    <div className="dir-info-item-value">{children}</div>
  </div>
);

export const DirectiveDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const directiveId = Number(id);
  const actor = useDhActor();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<Dialog>(null);

  const { data: d, isLoading, error } = useQuery({
    queryKey: DIRECTIVE_KEY(directiveId),
    queryFn: () => fetchDirective(directiveId),
    enabled: Number.isInteger(directiveId),
  });

  const done = (message: string) => {
    setDialog(null);
    toast.success(message);
    queryClient.invalidateQueries({ queryKey: DIRECTIVES_KEY });
    queryClient.invalidateQueries({ queryKey: SUBMISSIONS_KEY });
  };
  const fail = (err: unknown) => {
    setDialog(null);
    toast.error(apiErrorMessage(err));
  };

  const ack = useMutation({ mutationFn: (owner?: number) => acknowledgeDirective(directiveId, owner), onSuccess: () => done('Đã tiếp nhận chỉ đạo.'), onError: fail });
  const link = useMutation({ mutationFn: (activityId: number) => linkDirectiveActivity(directiveId, activityId), onSuccess: () => done('Đã gắn hoạt động.'), onError: fail });
  const submit = useMutation({
    mutationFn: (payload: { source_type: 'activity'; source_id: number; note?: string }) => submitDirectiveResult(directiveId, payload),
    onSuccess: () => done('Đã nộp kết quả.'), onError: fail,
  });
  const respond = useMutation({
    mutationFn: (payload: { response: 'accepted' | 'revision_requested'; response_note?: string }) => respondDirective(directiveId, payload),
    onSuccess: (_r, vars) => done(vars.response === 'accepted' ? 'Đã chấp nhận kết quả.' : 'Đã yêu cầu sửa.'), onError: fail,
  });

  if (isLoading) return <p role="status" className="ppl-state">Đang tải chỉ đạo...</p>;
  if (error || !d) return <ErrorLine message={apiErrorMessage(error, 'Không tải được chỉ đạo.')} />;

  const status = directiveStatus(d.status);
  return (
    <div className="dir">
      <Link className="dir-back" to="/directives">← Danh sách chỉ đạo</Link>
      <div className="dir-title-row">
        <h1 className="ppl-h1">{d.title}</h1>
        <StatusBadge label={status.label} tone={status.tone} />
      </div>
      <div className="dir-actions">
        {canAcknowledgeDirective(actor, d) && <Button variant="primary" onClick={() => setDialog('ack')}>Tiếp nhận</Button>}
        {canLinkActivity(actor, d) && <Button onClick={() => setDialog('link')}>Gắn hoạt động</Button>}
        {canSubmitDirective(actor, d) && <Button variant="primary" onClick={() => setDialog('submit')}>Nộp kết quả</Button>}
        {canRespondDirective(actor, d) && (
          <>
            <Button variant="primary" onClick={() => setDialog('accept')}>Chấp nhận</Button>
            <Button variant="danger" onClick={() => setDialog('revise')}>Yêu cầu sửa</Button>
          </>
        )}
      </div>

      <div className="dir-info">
        <Info label="Đơn vị giao">{d.from_unit_name ?? `Đơn vị #${d.from_unit_id}`}</Info>
        <Info label="Đơn vị nhận">{d.to_unit_name ?? `Đơn vị #${d.to_unit_id}`}</Info>
        <Info label="Hạn hoàn thành">{formatVnDate(d.deadline) || '—'}</Info>
        <Info label="Người giao">{d.created_by_name ?? '—'}</Info>
        <Info label="Người phụ trách">{d.owner_name ?? 'Chưa có'}</Info>
        {d.acknowledged_at && <Info label="Tiếp nhận lúc">{formatVnDate(d.acknowledged_at)}</Info>}
        {d.body && <Info label="Nội dung" wide>{d.body}</Info>}
      </div>

      <h2 className="dir-h2">Hoạt động liên kết</h2>
      {d.activities.length === 0 ? <p className="dir-muted">Chưa gắn hoạt động nào.</p> : (
        <ul className="dir-list">
          {d.activities.map((a) => (
            <li key={a.id} className="dir-list-item"><span><Link to={`/activity/${a.id}`}>{a.title}</Link> ({getActivityStatusMeta(a.status).text})</span></li>
          ))}
        </ul>
      )}

      <h2 className="dir-h2">Kết quả đã nộp</h2>
      {d.submissions.length === 0 ? <p className="dir-muted">Chưa nộp kết quả.</p> : (
        <ul className="dir-list">
          {d.submissions.map((s) => {
            const st = submissionStatus(s);
            return (
              <li key={s.id} className="dir-list-item">
                <div className="dir-list-item-main">
                  <Link to={`/submission/${s.id}`}>{sourceText(s)}</Link>
                  <StatusBadge label={st.label} tone={st.tone} />
                </div>
                {s.note && <div className="dir-note">Ghi chú: {s.note}</div>}
                {s.response_note && <div className="dir-note">Phản hồi: {s.response_note}</div>}
              </li>
            );
          })}
        </ul>
      )}

      <AcknowledgeDialog isOpen={dialog === 'ack'} unitId={d.to_unit_id} defaultOwnerId={actor.userId} isLoading={ack.isPending}
        onSubmit={(owner) => ack.mutate(owner)} onCancel={() => setDialog(null)} />
      <LinkActivityDialog isOpen={dialog === 'link'} directive={d} isLoading={link.isPending}
        onSubmit={(activityId) => link.mutate(activityId)} onCancel={() => setDialog(null)} />
      <SubmitResultDialog isOpen={dialog === 'submit'} directive={d} isLoading={submit.isPending}
        onSubmit={(payload) => submit.mutate(payload)} onCancel={() => setDialog(null)} />
      <ReasonFormDialog isOpen={dialog === 'accept'} title="Chấp nhận kết quả" label="Ghi chú" required={false} confirmLabel="Chấp nhận"
        isLoading={respond.isPending} onSubmit={(note) => respond.mutate({ response: 'accepted', response_note: note || undefined })}
        onCancel={() => setDialog(null)} />
      <ReasonFormDialog isOpen={dialog === 'revise'} title="Yêu cầu sửa" confirmLabel="Gửi yêu cầu" danger
        isLoading={respond.isPending} onSubmit={(note) => respond.mutate({ response: 'revision_requested', response_note: note })}
        onCancel={() => setDialog(null)} />
    </div>
  );
};
