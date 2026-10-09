import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import {
  acknowledgeDirective, apiErrorMessage, fetchDirective, linkDirectiveActivity, respondDirective, submitDirectiveResult,
} from '../../api';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import { ReasonDialog } from '../../../shared/components/ReasonDialog';
import { useToast } from '../../../shared/components/Toast';
import { formatVnDate } from '../../../shared/utils/date';
import { DIRECTIVE_KEY, DIRECTIVES_KEY, SUBMISSIONS_KEY } from '../dieuhanh/queryKeys';
import { useDhActor } from '../dieuhanh/useDhActor';
import { getActivityStatusMeta } from '../activities/activityLabels';
import {
  canAcknowledgeDirective, canLinkActivity, canRespondDirective, canSubmitDirective,
} from '../dieuhanh/permissions';
import { directiveStatus, sourceText, submissionStatus } from '../dieuhanh/labels';
import { ErrorText, StatusLozenge } from '../dieuhanh/parts';
import { AcknowledgeDialog, LinkActivityDialog, SubmitResultDialog } from './DirectiveDialogs';

type Dialog = null | 'ack' | 'link' | 'submit' | 'accept' | 'revise';

const Info: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ fontSize: 12, color: token('color.text.subtle', '#5E6C84') }}>{label}</div>
    <div>{children}</div>
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

  if (isLoading) return <LottieLoading message="Đang tải chỉ đạo..." size={80} />;
  if (error || !d) return <ErrorText message={apiErrorMessage(error, 'Không tải được chỉ đạo.')} />;

  const status = directiveStatus(d.status);
  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <p><Link to="/directives">← Danh sách chỉ đạo</Link></p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>{d.title}</h1>
        <StatusLozenge label={status.label} tone={status.tone} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
        {canAcknowledgeDirective(actor, d) && <Button appearance="primary" onClick={() => setDialog('ack')}>Tiếp nhận</Button>}
        {canLinkActivity(actor, d) && <Button onClick={() => setDialog('link')}>Gắn hoạt động</Button>}
        {canSubmitDirective(actor, d) && <Button appearance="primary" onClick={() => setDialog('submit')}>Nộp kết quả</Button>}
        {canRespondDirective(actor, d) && (
          <>
            <Button appearance="primary" onClick={() => setDialog('accept')}>Chấp nhận</Button>
            <Button appearance="danger" onClick={() => setDialog('revise')}>Yêu cầu sửa</Button>
          </>
        )}
      </div>

      <Info label="Đơn vị giao">{d.from_unit_name ?? `Đơn vị #${d.from_unit_id}`}</Info>
      <Info label="Đơn vị nhận">{d.to_unit_name ?? `Đơn vị #${d.to_unit_id}`}</Info>
      <Info label="Hạn hoàn thành">{formatVnDate(d.deadline) || '—'}</Info>
      <Info label="Người giao">{d.created_by_name ?? '—'}</Info>
      <Info label="Người phụ trách">{d.owner_name ?? 'Chưa có'}</Info>
      {d.acknowledged_at && <Info label="Tiếp nhận lúc">{formatVnDate(d.acknowledged_at)}</Info>}
      {d.body && <Info label="Nội dung"><span style={{ whiteSpace: 'pre-wrap' }}>{d.body}</span></Info>}

      <h2 style={{ marginTop: 24 }}>Hoạt động liên kết</h2>
      {d.activities.length === 0 ? <p>Chưa gắn hoạt động nào.</p> : (
        <ul>{d.activities.map((a) => <li key={a.id}><Link to={`/activity/${a.id}`}>{a.title}</Link> ({getActivityStatusMeta(a.status).text})</li>)}</ul>
      )}

      <h2 style={{ marginTop: 24 }}>Kết quả đã nộp</h2>
      {d.submissions.length === 0 ? <p>Chưa nộp kết quả.</p> : (
        <ul>
          {d.submissions.map((s) => {
            const st = submissionStatus(s);
            return (
              <li key={s.id} style={{ marginBottom: 8 }}>
                <Link to={`/submission/${s.id}`}>{sourceText(s)}</Link>{' '}
                <StatusLozenge label={st.label} tone={st.tone} />
                {s.note && <div>Ghi chú: {s.note}</div>}
                {s.response_note && <div>Phản hồi: {s.response_note}</div>}
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
      <ReasonDialog isOpen={dialog === 'accept'} title="Chấp nhận kết quả" label="Ghi chú" required={false} confirmLabel="Chấp nhận"
        isLoading={respond.isPending} onSubmit={(note) => respond.mutate({ response: 'accepted', response_note: note || undefined })}
        onCancel={() => setDialog(null)} />
      <ReasonDialog isOpen={dialog === 'revise'} title="Yêu cầu sửa" confirmLabel="Gửi yêu cầu" appearance="danger"
        isLoading={respond.isPending} onSubmit={(note) => respond.mutate({ response: 'revision_requested', response_note: note })}
        onCancel={() => setDialog(null)} />
    </div>
  );
};
