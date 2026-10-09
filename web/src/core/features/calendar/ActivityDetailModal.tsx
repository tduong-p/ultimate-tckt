import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import CrossIcon from '@atlaskit/icon/core/cross';
import CalendarIcon from '@atlaskit/icon/core/calendar';
import PeopleGroupIcon from '@atlaskit/icon/core/people-group';
import TextArea from '@atlaskit/textarea';
import type { ActivityItem } from '../../api';
import {
  approveActivity,
  rejectActivity,
  requestChangesActivity,
  submitActivityProposal,
} from '../../api';
import { getActivityStatusMeta, getActivityTypeShortLabel } from '../activities/activityLabels';
import { toVnDateKey } from '../../../shared/utils/date';

export interface ActivityDetailModalProps {
  activity: ActivityItem | null;
  isOpen: boolean;
  onClose: () => void;
  canManageProposals?: boolean;
  canManageActivity?: boolean;
  onProposalDecided?: () => void;
  onOpenCreateTask?: (activity: ActivityItem) => void;
}

const formatDateDisplay = (dateStr?: string | null): string => {
  if (!dateStr) return 'Chưa thiết lập';
  try {
    const parts = toVnDateKey(dateStr).split('-');
    if (parts.length >= 3) {
      const year = parts[0];
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
};

const getStatusLozenge = (status?: string) => {
  const meta = getActivityStatusMeta(status);
  return <Lozenge appearance={meta.appearance}>{meta.label}</Lozenge>;
};

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  activity,
  isOpen,
  onClose,
  canManageProposals = false,
  canManageActivity = false,
  onProposalDecided,
  onOpenCreateTask,
}) => {
  const [feedbackPrompt, setFeedbackPrompt] = useState<'request_changes' | 'reject' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isOpen || !activity) return null;

  const handleApprove = async () => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      await approveActivity(activity.id);
      onProposalDecided?.();
      onClose();
    } catch (err: any) {
      setActionError(err?.response?.data?.error || err?.message || 'Không thể phê duyệt hoạt động.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmFeedback = async () => {
    const trimmed = feedbackText.trim();
    if (!trimmed) {
      setActionError('Vui lòng nhập lý do/nội dung phản hồi.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    try {
      if (feedbackPrompt === 'request_changes') {
        await requestChangesActivity(activity.id, trimmed);
      } else if (feedbackPrompt === 'reject') {
        await rejectActivity(activity.id, trimmed);
      }
      setFeedbackPrompt(null);
      setFeedbackText('');
      onProposalDecided?.();
      onClose();
    } catch (err: any) {
      setActionError(err?.response?.data?.error || err?.message || 'Không thể thực hiện thao tác.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResubmit = async () => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      await submitActivityProposal(activity.id);
      onProposalDecided?.();
    } catch (err: any) {
      setActionError(err?.response?.data?.error || err?.message || 'Không thể nộp lại đề xuất.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-testid="activity-detail-modal-overlay"
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
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        data-testid="activity-detail-modal"
        style={{
          backgroundColor: token('elevation.surface.overlay', '#FFFFFF'),
          borderRadius: '8px',
          boxShadow: token(
            'elevation.shadow.overlay',
            '0 8px 16px -4px rgba(9, 30, 66, 0.25), 0 0 0 1px rgba(9, 30, 66, 0.08)'
          ),
          width: '100%',
          maxWidth: '600px',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          animation: 'fadeIn 0.15s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px 16px 24px',
            borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: token('color.text.subtle', '#5E6C84'),
                  backgroundColor: token('color.background.neutral', '#EBECF0'),
                  padding: '2px 6px',
                  borderRadius: '3px',
                }}
              >
                #HĐ-{activity.id}
              </span>
              {getStatusLozenge(activity.status)}
              {getActivityTypeShortLabel(activity.type) && (
                <Lozenge appearance={activity.type === 'event' ? 'inprogress' : 'default'}>
                  {getActivityTypeShortLabel(activity.type)}
                </Lozenge>
              )}
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 600,
                color: token('color.text', '#172B4D'),
                lineHeight: 1.35,
                wordBreak: 'break-word',
              }}
            >
              {activity.title}
            </h2>
          </div>

          <button
            type="button"
            data-testid="activity-detail-modal-close-header"
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

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {actionError && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                borderRadius: '4px',
                backgroundColor: token('color.background.danger', '#FFEBE6'),
                color: token('color.text.danger', '#DE350B'),
                fontSize: '13px',
              }}
            >
              {actionError}
            </div>
          )}

          {/* Key Info Metadata Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
              marginBottom: '20px',
              backgroundColor: token('color.background.neutral.subtle', '#FAFBFC'),
              padding: '16px',
              borderRadius: '6px',
              border: `1px solid ${token('color.border', '#EBECF0')}`,
            }}
          >
            {/* Team / Organizer */}
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: token('color.text.subtlest', '#6B778C'),
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <PeopleGroupIcon label="" size="small" />
                <span>Tổ phụ trách</span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: token('color.text', '#172B4D') }}>
                {activity.team_name ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {activity.team_color && (
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: activity.team_color,
                          display: 'inline-block',
                        }}
                      />
                    )}
                    {activity.team_name}
                  </span>
                ) : (
                  'Không có thông tin'
                )}
              </div>
            </div>

            {/* Time / Dates */}
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: token('color.text.subtlest', '#6B778C'),
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <CalendarIcon label="" size="small" />
                <span>Thời gian</span>
              </div>
              <div style={{ fontSize: '13px', color: token('color.text', '#172B4D') }}>
                <div>
                  <span style={{ color: token('color.text.subtle', '#5E6C84') }}>Bắt đầu: </span>
                  <strong>{formatDateDisplay(activity.start_date)}</strong>
                </div>
                <div style={{ marginTop: '2px' }}>
                  <span style={{ color: token('color.text.subtle', '#5E6C84') }}>Hạn chót: </span>
                  <strong>{formatDateDisplay(activity.deadline)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: token('color.text.subtle', '#5E6C84'),
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px',
              }}
            >
              Mô tả chi tiết
            </div>
            <div
              style={{
                fontSize: '14px',
                lineHeight: 1.6,
                color: token('color.text', '#172B4D'),
                backgroundColor: token('elevation.surface', '#FFFFFF'),
                padding: '12px 16px',
                borderRadius: '6px',
                border: `1px solid ${token('color.border', '#DFE1E6')}`,
                minHeight: '80px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {activity.description ? (
                activity.description
              ) : (
                <span style={{ fontStyle: 'italic', color: token('color.text.subtlest', '#6B778C') }}>
                  Chưa có mô tả chi tiết cho hoạt động này.
                </span>
              )}
            </div>
          </div>

          {/* Feedback prompt section */}
          {feedbackPrompt && (
            <div
              style={{
                padding: '16px',
                borderRadius: '6px',
                backgroundColor:
                  feedbackPrompt === 'reject'
                    ? token('color.background.danger', '#FFEBE6')
                    : token('color.background.warning', '#FFF0B3'),
                border: `1px solid ${token('color.border', '#DFE1E6')}`,
                marginBottom: '16px',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
                {feedbackPrompt === 'reject' ? 'Lý do từ chối đề án' : 'Ý kiến yêu cầu sửa đổi'}
              </div>
              <TextArea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder={
                  feedbackPrompt === 'reject'
                    ? 'Nhập lý do từ chối và hủy đề án (bắt buộc)...'
                    : 'Nhập nội dung cần điều chỉnh hoặc bổ sung (bắt buộc)...'
                }
                rows={3}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' }}>
                <Button appearance="subtle" onClick={() => setFeedbackPrompt(null)} isDisabled={isSubmitting}>
                  Hủy
                </Button>
                <Button
                  appearance={feedbackPrompt === 'reject' ? 'danger' : 'warning'}
                  onClick={handleConfirmFeedback}
                  isLoading={isSubmitting}
                >
                  {feedbackPrompt === 'reject' ? 'Xác nhận từ chối' : 'Gửi yêu cầu'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: token('elevation.surface', '#FAFBFC'),
            borderBottomLeftRadius: '8px',
            borderBottomRightRadius: '8px',
          }}
        >
          {/* Action buttons (Left/Center) */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {activity.status === 'proposed' && canManageProposals && !feedbackPrompt && (
              <>
                <Button appearance="primary" onClick={handleApprove} isLoading={isSubmitting}>
                  Phê duyệt
                </Button>
                <Button appearance="warning" onClick={() => setFeedbackPrompt('request_changes')} isDisabled={isSubmitting}>
                  Yêu cầu sửa đổi
                </Button>
                <Button appearance="danger" onClick={() => setFeedbackPrompt('reject')} isDisabled={isSubmitting}>
                  Từ chối
                </Button>
              </>
            )}

            {activity.status === 'changes_requested' && (canManageActivity || canManageProposals) && (
              <Button appearance="primary" onClick={handleResubmit} isLoading={isSubmitting}>
                Nộp lại đề xuất
              </Button>
            )}

            {['approved', 'active'].includes(activity.status) && canManageActivity && onOpenCreateTask && (
              <Button appearance="discovery" onClick={() => onOpenCreateTask(activity)}>
                + Thêm nhiệm vụ
              </Button>
            )}
          </div>

          {/* Close button (Right) */}
          <Button testId="activity-detail-modal-close-footer" appearance="subtle" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};
