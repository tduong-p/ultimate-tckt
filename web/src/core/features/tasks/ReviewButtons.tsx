import React, { useState } from 'react';
import Button from '@atlaskit/button/new';
import type { ReviewDecision } from '../../api';
import { ReviewDialog, REVIEW_DECISIONS } from './ReviewDialog';

/** Ba nút duyệt; nút nào cũng mở hộp duyệt với quyết định tương ứng được chọn sẵn. */
export const ReviewButtons: React.FC<{ taskId: number; taskTitle: string }> = ({ taskId, taskTitle }) => {
  const [decision, setDecision] = useState<ReviewDecision | null>(null);
  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {REVIEW_DECISIONS.map((d) => (
          <Button
            key={d.value}
            spacing="compact"
            appearance={d.value === 'approve' ? 'primary' : d.value === 'cancel' ? 'danger' : 'default'}
            onClick={() => setDecision(d.value)}
          >
            {d.label}
          </Button>
        ))}
      </div>
      <ReviewDialog
        isOpen={decision !== null}
        taskId={taskId}
        taskTitle={taskTitle}
        initialDecision={decision ?? 'approve'}
        onClose={() => setDecision(null)}
      />
    </>
  );
};
