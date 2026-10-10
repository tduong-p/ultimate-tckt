import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Field } from '../../../ui';
import {
  apiErrorMessage, fetchSubmission, respondSubmission, withdrawSubmission, type Submission, type SubmissionResponse,
} from '../../api';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useToast } from '../../../shared/components/Toast';
import { formatVnDate } from '../../../shared/utils/date';
import { DIRECTIVES_KEY, SUBMISSION_KEY, SUBMISSIONS_KEY } from '../dieuhanh/queryKeys';
import { useDhActor } from '../dieuhanh/useDhActor';
import { canRespondSubmission, canWithdrawSubmission, submissionResponseOptions } from '../dieuhanh/permissions';
import { RESPONSE_LABEL, SOURCE_LABEL, submissionStatus } from '../dieuhanh/labels';
import { ErrorText, FormDialog, SelectField, StatusLozenge } from '../dieuhanh/parts';
import '../people/people.css';
import './submissions.css';

const Info: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="sub-info-item">
    <div className="sub-info-item-label">{label}</div>
    <div className="sub-info-item-value">{children}</div>
  </div>
);

const RespondDialog: React.FC<{
  isOpen: boolean; submission: Submission; isLoading: boolean;
  onSubmit: (payload: { response: SubmissionResponse; response_note?: string }) => void; onCancel: () => void;
}> = ({ isOpen, submission, isLoading, onSubmit, onCancel }) => {
  const [response, setResponse] = useState<SubmissionResponse>('seen');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (isOpen) { setResponse('seen'); setNote(''); setError(''); } }, [isOpen]);
  const options = submissionResponseOptions(submission);
  const submit = () => {
    if (response === 'revision_requested' && !note.trim()) { setError('Vui lòng nhập lý do.'); return; }
    onSubmit({ response, response_note: note.trim() || undefined });
  };
  return (
    <FormDialog isOpen={isOpen} title="Phản hồi trình" confirmLabel="Gửi phản hồi" isLoading={isLoading} onSubmit={submit} onCancel={onCancel}>
      <SelectField label="Phản hồi" value={response} onChange={(v) => { setResponse(v as SubmissionResponse); setError(''); }}
        options={options.map((value) => ({ value, label: RESPONSE_LABEL[value] }))} />
      <Field label={response === 'revision_requested' ? 'Lý do *' : 'Ghi chú'}>
        <textarea rows={3} value={note} onChange={(e) => { setNote(e.target.value); setError(''); }} />
      </Field>
      {submission.directive_id && (
        <p className="sub-directive-hint">
          Trình này thuộc một chỉ đạo. Để kết thúc chỉ đạo, đánh giá tại trang Giao việc.
        </p>
      )}
      <ErrorText message={error} />
    </FormDialog>
  );
};

export const SubmissionDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const submissionId = Number(id);
  const actor = useDhActor();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<null | 'respond' | 'withdraw'>(null);

  const { data: s, isLoading, error } = useQuery({
    queryKey: SUBMISSION_KEY(submissionId),
    queryFn: () => fetchSubmission(submissionId),
    enabled: Number.isInteger(submissionId),
  });

  const done = (message: string) => {
    setDialog(null);
    toast.success(message);
    queryClient.invalidateQueries({ queryKey: SUBMISSIONS_KEY });
    queryClient.invalidateQueries({ queryKey: DIRECTIVES_KEY });
  };
  const fail = (err: unknown) => { setDialog(null); toast.error(apiErrorMessage(err)); };

  const respond = useMutation({
    mutationFn: (payload: { response: SubmissionResponse; response_note?: string }) => respondSubmission(submissionId, payload),
    onSuccess: () => done('Đã gửi phản hồi.'), onError: fail,
  });
  const withdraw = useMutation({ mutationFn: () => withdrawSubmission(submissionId), onSuccess: () => done('Đã rút lại.'), onError: fail });

  if (isLoading) return <p role="status" className="ppl-state">Đang tải...</p>;
  if (error || !s) return <ErrorText message={apiErrorMessage(error, 'Không tải được trình.')} />;

  const st = submissionStatus(s);
  const sourceName = s.source_title ?? `${SOURCE_LABEL[s.source_type]} #${s.source_id}`;
  const sourcePath = s.source_type === 'activity' ? `/activity/${s.source_id}` : s.source_type === 'ops_log' ? `/ops-log/${s.source_id}` : null;

  return (
    <div className="sub">
      <p><Link className="sub-back" to="/submissions">← Danh sách trình</Link></p>
      <div className="sub-title-row">
        <h1 className="ppl-h1">Trình #{s.id}</h1>
        <StatusLozenge label={st.label} tone={st.tone} />
      </div>
      <div className="sub-actions">
        {canRespondSubmission(actor, s) && <Button variant="primary" onClick={() => setDialog('respond')}>Phản hồi</Button>}
        {canWithdrawSubmission(actor, s) && <Button variant="danger" onClick={() => setDialog('withdraw')}>Rút lại</Button>}
      </div>

      <div className="sub-info">
        <Info label={`Nguồn (${SOURCE_LABEL[s.source_type]})`}>{sourcePath ? <Link to={sourcePath}>{sourceName}</Link> : sourceName}</Info>
        <Info label="Đơn vị gửi">{s.from_unit_name ?? `Đơn vị #${s.from_unit_id}`}</Info>
        <Info label="Đơn vị nhận">{s.to_unit_name ?? `Đơn vị #${s.to_unit_id}`}</Info>
        <Info label="Người trình">{s.submitted_by_name ?? '—'}</Info>
        <Info label="Ngày trình">{formatVnDate(s.created_at)}</Info>
        {s.directive_id && <Info label="Chỉ đạo"><Link to={`/directive/${s.directive_id}`}>Xem chỉ đạo #{s.directive_id}</Link></Info>}
        {s.note && <div className="sub-note"><Info label="Ghi chú"><span>{s.note}</span></Info></div>}
        {s.response && (
          <>
            <h2 className="sub-h2" style={{ gridColumn: '1 / -1' }}>Phản hồi</h2>
            <Info label="Kết quả">{RESPONSE_LABEL[s.response]}</Info>
            {s.response_note && <div className="sub-note"><Info label="Nội dung"><span>{s.response_note}</span></Info></div>}
            <Info label="Người phản hồi">{s.responded_by_name ?? '—'}</Info>
            {s.responded_at && <Info label="Lúc">{formatVnDate(s.responded_at)}</Info>}
          </>
        )}
        {s.withdrawn_at && <Info label="Đã rút lại lúc">{formatVnDate(s.withdrawn_at)}</Info>}
      </div>

      <RespondDialog isOpen={dialog === 'respond'} submission={s} isLoading={respond.isPending}
        onSubmit={(payload) => respond.mutate(payload)} onCancel={() => setDialog(null)} />
      <ConfirmDialog isOpen={dialog === 'withdraw'} title="Rút lại trình" confirmLabel="Rút lại" appearance="danger"
        isLoading={withdraw.isPending} onConfirm={() => withdraw.mutate()} onCancel={() => setDialog(null)}>
        Đơn vị nhận sẽ không thể phản hồi trình này nữa. Chỉ rút lại được khi chưa có phản hồi.
      </ConfirmDialog>
    </div>
  );
};
