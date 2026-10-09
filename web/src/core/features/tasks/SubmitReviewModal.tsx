import React, { useState, useEffect } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import CrossIcon from '@atlaskit/icon/core/cross';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { TaskItem } from '../../api';
import { submitTaskReview } from '../../api';

export interface SubmitReviewModalProps {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SubmitReviewModal: React.FC<SubmitReviewModalProps> = ({
  task,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [linkUrl, setLinkUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLinkUrl('');
      setNotes('');
      setErrorMsg(null);
    }
  }, [isOpen]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!task) return;
      return submitTaskReview(task.id, {
        link_url: linkUrl.trim() || undefined,
        notes: notes.trim() || undefined,
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

    const trimmedLink = linkUrl.trim();
    if (trimmedLink && !/^https?:\/\//i.test(trimmedLink)) {
      setErrorMsg('Link minh chứng phải bắt đầu bằng http:// hoặc https://');
      return;
    }

    submitMutation.mutate();
  };

  const activeError =
    errorMsg ||
    (submitMutation.error as any)?.response?.data?.error ||
    submitMutation.error?.message;

  return (
    <div
      data-testid="submit-review-modal-overlay"
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
        data-testid="submit-review-modal"
        style={{
          backgroundColor: token('elevation.surface.overlay', '#FFFFFF'),
          borderRadius: '8px',
          boxShadow: token(
            'elevation.shadow.overlay',
            '0 8px 16px -4px rgba(9, 30, 66, 0.25), 0 0 0 1px rgba(9, 30, 66, 0.08)'
          ),
          width: '100%',
          maxWidth: '560px',
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
              Nộp nghiệm thu công việc
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
                htmlFor="submit-review-link"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: token('color.text.subtle', '#6B778C'),
                  marginBottom: '4px',
                }}
              >
                Link minh chứng
              </label>
              <Textfield
                id="submit-review-link"
                name="link_url"
                value={linkUrl}
                onChange={(e) => setLinkUrl((e.target as HTMLInputElement).value)}
                placeholder="https://drive.google.com/... hoặc link sản phẩm"
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="submit-review-notes"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: token('color.text.subtle', '#6B778C'),
                  marginBottom: '4px',
                }}
              >
                Ghi chú bàn giao
              </label>
              <TextArea
                id="submit-review-notes"
                name="notes"
                value={notes}
                onChange={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
                placeholder="Mô tả kết quả thực hiện, lưu ý khi nghiệm thu..."
                minimumRows={3}
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
              appearance="primary"
              type="submit"
              isLoading={submitMutation.isPending}
            >
              Gửi nghiệm thu
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
