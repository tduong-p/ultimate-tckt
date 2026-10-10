import React, { useId, useState } from 'react';
import { Button, Badge, Select } from '../../../ui';
import { postActivityUpdate, type ActivityUpdate, type ActivityUpdateKind, type PostUpdatePayload, type TaggablePerson } from '../../api';
import { Card } from './ActivityInfoSections';
import { useActivityMutation } from './useActivityMutation';
import { PeoplePicker } from '../../../shared/components/PeoplePicker';
import { LinkField } from '../../../shared/components/LinkField';
import { formatVnDate } from '../../../shared/utils/date';
import { isHttpUrl } from '../../../shared/utils/url';

const KIND_OPTIONS: Array<{ value: ActivityUpdateKind; label: string }> = [
  { value: 'comment', label: 'Bình luận' },
  { value: 'progress', label: 'Tiến độ' },
  { value: 'issue', label: 'Vướng mắc' },
  { value: 'evidence', label: 'Minh chứng' },
];

const KIND_LABELS: Record<string, string> = {
  ...Object.fromEntries(KIND_OPTIONS.map((o) => [o.value, o.label])),
  review_note: 'Ghi chú duyệt',
};

const Timeline: React.FC<{ updates: ActivityUpdate[] }> = ({ updates }) => {
  if (updates.length === 0) return <p className="act-flat">Chưa có cập nhật nào.</p>;
  return (
    <ul className="act-list act-timeline">
      {updates.map((u) => (
        <li key={u.id} className="act-update">
          <div className="act-task-head">
            <strong>{u.user_name}</strong>
            <Badge tone={u.kind === 'issue' ? 'danger' : u.kind === 'evidence' ? 'success' : 'neutral'}>{KIND_LABELS[u.kind] ?? u.kind}</Badge>
            <span className="act-muted">{formatVnDate(u.created_at)}</span>
          </div>
          <div className="act-update-body">{u.body}</div>
          {u.tagged_users.length > 0 && (
            <div className="act-tags">
              {u.tagged_users.map((t) => (
                <span key={t.id} className="act-tag">
                  {`@${t.name}`}
                </span>
              ))}
            </div>
          )}
          {u.attachment_url && isHttpUrl(u.attachment_url) && (
            <a href={u.attachment_url} target="_blank" rel="noopener noreferrer">
              Mở link đính kèm
            </a>
          )}
        </li>
      ))}
    </ul>
  );
};

export const ActivityUpdatesSection: React.FC<{ activityId: number; updates: ActivityUpdate[]; taggablePeople: TaggablePerson[]; canWrite: boolean }> = ({
  activityId,
  updates,
  taggablePeople,
  canWrite,
}) => {
  const kindId = useId();
  const bodyId = useId();
  const [kind, setKind] = useState<ActivityUpdateKind>('comment');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [tagged, setTagged] = useState<number[]>([]);
  const [error, setError] = useState('');

  const post = useActivityMutation(activityId, (payload: PostUpdatePayload) => postActivityUpdate(activityId, payload), {
    message: 'Đã đăng cập nhật.',
    onDone: () => {
      setBody('');
      setLink('');
      setTagged([]);
      setError('');
    },
  });

  const submit = () => {
    if (!body.trim()) {
      setError('Hãy nhập nội dung cập nhật.');
      return;
    }
    if (link.trim() && !isHttpUrl(link)) {
      setError('Hãy sửa link đính kèm trước khi đăng.');
      return;
    }
    setError('');
    post.mutate({
      kind,
      body: body.trim(),
      ...(link.trim() ? { attachment_url: link.trim() } : {}),
      ...(kind === 'comment' && tagged.length > 0 ? { tagged_user_ids: tagged } : {}),
    });
  };

  return (
    <Card title="Cập nhật" testId="section-updates">
      <Timeline updates={updates} />
      {canWrite && <>
      <div className="act-form-row">
        <label htmlFor={kindId}>Loại cập nhật</label>
        <Select
          id={kindId}
          value={kind}
          options={KIND_OPTIONS}
          onChange={(v) => {
            setKind(v as ActivityUpdateKind);
            if (v !== 'comment') setTagged([]);
          }}
        />
      </div>
      <div className="act-form-row">
        <label htmlFor={bodyId}>Nội dung cập nhật</label>
        <textarea id={bodyId} className="act-textarea" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <LinkField label="Link đính kèm (không bắt buộc)" value={link} onChange={setLink} />
      {kind === 'comment' && (
        <div className="act-form-row">
          <PeoplePicker label="Gắn thẻ @" people={taggablePeople} value={tagged} onChange={setTagged} />
        </div>
      )}
      {error && <p role="alert" className="act-field-error">{error}</p>}
      <div className="act-form-row">
        <Button variant="primary" disabled={post.isPending} onClick={submit}>
          Đăng cập nhật
        </Button>
      </div>
      </>}
    </Card>
  );
};
