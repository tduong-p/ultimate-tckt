import React, { useState } from 'react';
import { Button } from '../../../ui';
import { taskAttachmentContentUrl, type TaskAttachment } from '../../api';
import { QuotaBar } from '../../../shared/components/QuotaBar';
import { isHttpUrl } from '../../../shared/utils/url';
import { formatBytes } from '../../../shared/utils/bytes';
import { formatVnDate } from '../../../shared/utils/date';
import { getAttachmentKindLabel } from './taskLabels';
import { AddAttachmentDialog } from './AddAttachmentDialog';
import './tasks.css';

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
      <div className="tk-sec-head">
        <h3 className="tk-h3">Tài liệu và liên kết</h3>
        {canAttach && (
          <Button size="sm" onClick={() => setOpen(true)}>
            Thêm tài liệu
          </Button>
        )}
      </div>
      <QuotaBar usedBytes={used} />
      {attachments.length === 0 && (
        <p className="tk-muted">Chưa có tài liệu hay liên kết.</p>
      )}
      <ul className="tk-list">
        {attachments.map((a) => (
          <li key={a.id} className="tk-list-item">
            <a
              href={a.link_url && isHttpUrl(a.link_url) ? a.link_url : taskAttachmentContentUrl(a.id)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {a.label}
            </a>
            <div className="tk-meta">
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
