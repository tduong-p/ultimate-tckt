import React, { useId, useState } from 'react';
import Button from '@atlaskit/button/new';
import TextArea from '@atlaskit/textarea';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import { postActivityUpdate, type ActivityUpdate, type ActivityUpdateKind, type PostUpdatePayload, type TaggablePerson } from '../../api';
import { Card } from './ActivityInfoSections';
import { ErrorText, FieldRow, NativeSelect } from './formBits';
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
  if (updates.length === 0) return <p style={{ margin: '0 0 12px' }}>Chưa có cập nhật nào.</p>;
  return (
    <ul style={{ margin: '0 0 16px', padding: 0, listStyle: 'none' }}>
      {updates.map((u) => (
        <li key={u.id} style={{ padding: '8px 0', borderTop: `1px solid ${token('color.border', '#DFE1E6')}` }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong>{u.user_name}</strong>
            <Lozenge appearance={u.kind === 'issue' ? 'removed' : u.kind === 'evidence' ? 'success' : 'default'}>{KIND_LABELS[u.kind] ?? u.kind}</Lozenge>
            <span style={{ color: token('color.text.subtle', '#5E6C84') }}>{formatVnDate(u.created_at)}</span>
          </div>
          <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', marginTop: 4 }}>{u.body}</div>
          {u.tagged_users.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
              {u.tagged_users.map((t) => (
                <span key={t.id} style={{ padding: '0 6px', borderRadius: 10, background: token('color.background.accent.blue.subtler', '#CCE0FF') }}>
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

export const ActivityUpdatesSection: React.FC<{ activityId: number; updates: ActivityUpdate[]; taggablePeople: TaggablePerson[] }> = ({
  activityId,
  updates,
  taggablePeople,
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
      <FieldRow label="Loại cập nhật" htmlFor={kindId}>
        <NativeSelect
          id={kindId}
          value={kind}
          options={KIND_OPTIONS}
          onChange={(v) => {
            setKind(v as ActivityUpdateKind);
            if (v !== 'comment') setTagged([]);
          }}
        />
      </FieldRow>
      <FieldRow label="Nội dung cập nhật" htmlFor={bodyId}>
        <TextArea id={bodyId} minimumRows={3} value={body} onChange={(e) => setBody((e.target as HTMLTextAreaElement).value)} />
      </FieldRow>
      <LinkField label="Link đính kèm (không bắt buộc)" value={link} onChange={setLink} />
      {kind === 'comment' && (
        <div style={{ marginTop: 12 }}>
          <PeoplePicker label="Gắn thẻ @" people={taggablePeople} value={tagged} onChange={setTagged} />
        </div>
      )}
      {error && <ErrorText>{error}</ErrorText>}
      <div style={{ marginTop: 12 }}>
        <Button appearance="primary" isLoading={post.isPending} onClick={submit}>
          Đăng cập nhật
        </Button>
      </div>
    </Card>
  );
};
