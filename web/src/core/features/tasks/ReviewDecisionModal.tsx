import React, { useState, useEffect } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import TextArea from '@atlaskit/textarea';
import CrossIcon from '@atlaskit/icon/core/cross';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { TaskItem } from '../../api';
import { reviewTask } from '../../api';

export interface ReviewDecisionModalProps {
  task: TaskItem | null;
  decision: 'reject' | 'cancel';
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReviewDecisionModal: React.FC<ReviewDecisionModalProps> = ({
  task,
  decision,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFeedback('');
      setErrorMsg(null);
    }
  }, [isOpen]);

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!task) return;
      return reviewTask(task.id, {
        decision,
        feedback: feedback.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['core-my-tasks-today'] });
      queryClient.invalidateQueries({ queryKey: ['core-bootstrap'] });
      queryClient.invalidateQueries({ queryKey: ['core-activities'] });
      onSuccess?.();
      onClose();
    },
  });

  if (!isOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmed = feedback.trim();
    if (!trimmed) {
      setErrorMsg(
        decision === 'reject'
          ? 'Vui lòng nhập lý do/nội dung yêu cầu làm lại.'
          : 'Vui lòng nhập lý do bác bỏ.'
      );
      return;
    }

    reviewMutation.mutate();
  };

  const isReject = decision === 'reject';
  const title = isReject ? 'Yêu cầu làm lại nhiệm vụ' : 'Bác bỏ nhiệm vụ';
  const submitBtnText = isReject ? 'Xác nhận yêu cầu làm lại' : 'Xác nhận bác bỏ';
  const placeholder = isReject
    ? 'Nêu rõ những điểm cần sửa đổi, bổ sung...'
    : 'Nêu lý do bác bỏ nhiệm vụ...';

  const activeError =
    errorMsg ||
    (reviewMutation.error as any)?.response?.data?.error ||
    reviewMutation.error?.message;

  return (
    <div
      data-testid="review-decision-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(9, 30, 66, 0.54)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        data-testid="review-decision-modal"
        style={{
          backgroundColor: token('elevation.surface.overlay', '#FFFFFF'),
          borderRadius: '8px',
          boxShadow: token(
            'elevation.shadow.overlay',
            '0 8px 16px -4px rgba(9, 30, 66, 0.25), 0 0 0 1px rgba(9, 30, 66, 0.08)'
          ),
          width: '100%',
          maxWidth: '540px',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          animation: 'fadeIn 0.15s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px 24px',
            borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 600,
                color: token('color.text', '#172B4D'),
              }}
            >
              {title}
            </h2>
            <div
              style={{
                marginTop: '4px',
                fontSize: '13px',
                color: token('color.text.subtle', '#6B778C'),
              }}
            >
              Nhiệm vụ: <strong>{task.title}</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '4px',
              color: token('color.icon.subtle', '#6B778C'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CrossIcon label="Đóng" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          <div
            style={{
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {activeError && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: token('color.background.danger', '#FFEBE6'),
                  border: `1px solid ${token('color.border.danger', '#FFBDAD')}`,
                  borderRadius: '4px',
                  color: token('color.text.danger', '#BF2600'),
                  fontSize: '13px',
                }}
              >
                {activeError}
              </div>
            )}

            <div>
              <label
                htmlFor="review-decision-feedback"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: token('color.text.subtle', '#6B778C'),
                  marginBottom: '4px',
                }}
              >
                Phản hồi / Ghi chú yêu cầu *
              </label>
              <TextArea
                id="review-decision-feedback"
                name="feedback"
                value={feedback}
                onChange={(e) => setFeedback((e.target as HTMLTextAreaElement).value)}
                placeholder={placeholder}
                minimumRows={4}
                autoFocus
              />
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <Button appearance="subtle" onClick={onClose}>
              Hủy
            </Button>
            <Button
              appearance={isReject ? 'warning' : 'danger'}
              type="submit"
              isLoading={reviewMutation.isPending}
            >
              {submitBtnText}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
