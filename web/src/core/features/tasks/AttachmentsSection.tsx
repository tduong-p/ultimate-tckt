import React, { useState } from 'react';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import { taskAttachmentContentUrl, type TaskAttachment } from '../../api';
import { QuotaBar } from '../../../shared/components/QuotaBar';
import { isHttpUrl } from '../../../shared/utils/url';
import { formatBytes } from '../../../shared/utils/bytes';
import { formatVnDate } from '../../../shared/utils/date';
import { getAttachmentKindLabel } from './taskLabels';
import { AddAttachmentDialog } from './AddAttachmentDialog';

export interface AttachmentsSectionProps {
  taskId: number;
  taskTitle: string;
  attachments: TaskAttachment[];
  /** Người được giao hoặc quản lý Tổ (server: canTouchTask). */
  canAttach: boolean;
}

export const AttachmentsSection: React.FC<AttachmentsSectionProps> = ({ taskId, taskTitle, attachments, canAttach }) => {
  const [open, setOpen] = useState(false);
  const used = attachments.reduce((sum, a) => sum + Number(a.size_bytes || 0), 0);
  return (
    <section aria-label="Tài liệu và liên kết">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
        <h3 style={{ fontSize: 14, margin: 0 }}>Tài liệu và liên kết</h3>
        {canAttach && (
          <Button spacing="compact" onClick={() => setOpen(true)}>
            Thêm tài liệu
          </Button>
        )}
      </div>
      <QuotaBar usedBytes={used} />
      {attachments.length === 0 && (
        <p style={{ color: token('color.text.subtle', '#626F86') }}>Chưa có tài liệu hay liên kết.</p>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
        {attachments.map((a) => (
          <li key={a.id} style={{ padding: '6px 0' }}>
            <a
              href={a.link_url && isHttpUrl(a.link_url) ? a.link_url : taskAttachmentContentUrl(a.id)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {a.label}
            </a>
            <div style={{ fontSize: 12, color: token('color.text.subtle', '#626F86') }}>
              {a.user_name} · {getAttachmentKindLabel(a.kind)}
              {Number(a.size_bytes) > 0 ? ` · ${formatBytes(Number(a.size_bytes))}` : ''} · {formatVnDate(a.created_at)}
            </div>
          </li>
        ))}
      </ul>
      <AddAttachmentDialog isOpen={open} taskId={taskId} taskTitle={taskTitle} onClose={() => setOpen(false)} />
    </section>
  );
};
