import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import Badge from '@atlaskit/badge';
import ArrowLeftIcon from '@atlaskit/icon/core/arrow-left';
import FileIcon from '@atlaskit/icon/core/file';
import { CtdCase, STATUS_CONFIG } from '../../data/ctdMockData';

interface ReviewCaseViewProps {
  caseData: CtdCase;
  onBack: () => void;
  onUpdateStatus?: (caseId: number, newStatus: any) => void;
}

export const ReviewCaseView: React.FC<ReviewCaseViewProps> = ({
  caseData,
  onBack,
  onUpdateStatus,
}) => {
  const [documents, setDocuments] = useState(caseData.documents);
  const [currentStatus, setCurrentStatus] = useState(caseData.status);
  const [supplementNote, setSupplementNote] = useState('');
  const [showSupplementModal, setShowSupplementModal] = useState(false);

  const statusCfg = STATUS_CONFIG[currentStatus] || {
    label: caseData.statusLabel,
    appearance: 'default',
  };

  const handleDocumentVerdict = (docId: number, verdict: 'ok' | 'need_supplement' | 'not_applicable') => {
    setDocuments((docs) =>
      docs.map((d) => (d.id === docId ? { ...d, status: verdict } : d))
    );
  };

  const handleApprove = () => {
    const nextStatus = currentStatus === 'dt_checking' ? 'tckt_checking' : 'eligible';
    setCurrentStatus(nextStatus);
    onUpdateStatus?.(caseData.id, nextStatus);
  };

  const handleRequestSupplement = () => {
    setCurrentStatus('need_supplement');
    onUpdateStatus?.(caseData.id, 'need_supplement');
    setShowSupplementModal(false);
  };

  const STEPS = [
    { key: 'submit', label: '1. Sinh viên nộp', done: true },
    { key: 'dt', label: '2. ĐT/LCĐ kiểm tra', done: currentStatus !== 'dt_checking' && currentStatus !== 'need_supplement', current: currentStatus === 'dt_checking' || currentStatus === 'need_supplement' },
    { key: 'tckt', label: '3. Ban TCKT kiểm tra', done: ['eligible', 'meeting_scheduled', 'vp_checking', 'forwarded'].includes(currentStatus), current: currentStatus === 'tckt_checking' },
    { key: 'meeting', label: '4. Họp xét cấp ĐT/LCĐ', done: ['vp_checking', 'forwarded'].includes(currentStatus), current: currentStatus === 'eligible' || currentStatus === 'meeting_scheduled' },
    { key: 'vp', label: '5. VP Đoàn & Chi bộ', done: currentStatus === 'forwarded', current: currentStatus === 'vp_checking' },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '4px' }}>
      {/* Navigation & Header */}
      <div style={{ marginBottom: '20px' }}>
        <Button appearance="subtle" onClick={onBack}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeftIcon label="" />
            <span>Quay lại danh sách hồ sơ</span>
          </span>
        </Button>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 600,
                color: token('color.text', '#172B4D'),
              }}
            >
              Hồ sơ: {caseData.fullName}
            </h1>
            <Lozenge appearance={statusCfg.appearance}>{statusCfg.label}</Lozenge>
          </div>
          <p
            style={{
              margin: '6px 0 0 0',
              fontSize: '14px',
              color: token('color.text.subtle', '#5E6C84'),
            }}
          >
            Mã hồ sơ: {caseData.code} · Nộp ngày: {caseData.submittedDate} · Đang tại: {caseData.unit}
          </p>
        </div>

        {/* Workflow Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            appearance="danger"
            onClick={() => setShowSupplementModal(true)}
          >
            Yêu cầu bổ sung
          </Button>
          <Button
            appearance="primary"
            onClick={handleApprove}
          >
            Thông qua hồ sơ
          </Button>
        </div>
      </div>

      {/* Process Stepper */}
      <div
        style={{
          backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          borderRadius: '8px',
          padding: '16px 20px',
          marginBottom: '24px',
          boxShadow: token(
            'elevation.shadow.raised',
            '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'
          ),
        }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: token('color.text.subtle', '#5E6C84'),
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          Tiến trình xử lý hồ sơ Đảng
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
          }}
        >
          {STEPS.map((step, idx) => (
            <div
              key={idx}
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                border: `1px solid ${
                  step.current
                    ? token('color.border.selected', '#0052CC')
                    : token('color.border', '#DFE1E6')
                }`,
                backgroundColor: step.current
                  ? token('color.background.selected', '#DEEBFF')
                  : step.done
                  ? token('color.background.success', '#E3FCEF')
                  : token('elevation.surface.sunken', '#F4F5F7'),
              }}
            >
              <div
                style={{
                  fontSize: '12.5px',
                  fontWeight: step.current ? 700 : 500,
                  color: step.current
                    ? token('color.text.selected', '#0052CC')
                    : step.done
                    ? token('color.text.success', '#006644')
                    : token('color.text.subtlest', '#7A869A'),
                }}
              >
                {step.label}
              </div>
              <div style={{ fontSize: '11px', marginTop: '4px' }}>
                {step.done ? '✓ Đã hoàn tất' : step.current ? '● Đang thực hiện' : '○ Chờ bước trước'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Candidate Profile Details */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          backgroundColor: token('elevation.surface', '#FFFFFF'),
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', color: token('color.text.subtle', '#5E6C84') }}>Họ và tên</div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: token('color.text', '#172B4D'), marginTop: '2px' }}>
            {caseData.fullName}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: token('color.text.subtle', '#5E6C84') }}>Mã số sinh viên</div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: token('color.text', '#172B4D'), marginTop: '2px' }}>
            {caseData.studentId}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: token('color.text.subtle', '#5E6C84') }}>Lớp · Khoá</div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: token('color.text', '#172B4D'), marginTop: '2px' }}>
            {caseData.className}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: token('color.text.subtle', '#5E6C84') }}>Loại hồ sơ</div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: token('color.text.accent.blue', '#0052CC'), marginTop: '2px' }}>
            {caseData.caseType}
          </div>
        </div>
      </div>

      {/* Document Review Section */}
      <div
        style={{
          backgroundColor: token('elevation.surface', '#FFFFFF'),
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
            backgroundColor: token('elevation.surface.sunken', '#F4F5F7'),
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: '15px', fontWeight: 600, color: token('color.text', '#172B4D') }}>
              Danh mục giấy tờ hồ sơ
            </span>
            <span style={{ marginLeft: '10px' }}>
              <Badge appearance="primary">{documents.length} mục</Badge>
            </span>
          </div>
          <div style={{ fontSize: '13px', color: token('color.text.subtle', '#5E6C84') }}>
            Cán bộ kiểm tra từng mục và đánh giá hợp lệ
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
          <thead>
            <tr
              style={{
                borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
                color: token('color.text.subtle', '#5E6C84'),
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              <th style={{ padding: '12px 20px', textAlign: 'left' }}>Tên giấy tờ quy định</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Tệp đính kèm</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Đánh giá</th>
              <th style={{ padding: '12px 20px', textAlign: 'right' }}>Thao tác thẩm định</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr
                key={doc.id}
                style={{
                  borderBottom: `1px solid ${token('color.border', '#EBECF0')}`,
                }}
              >
                <td style={{ padding: '14px 20px', fontWeight: 500, color: token('color.text', '#172B4D') }}>
                  {doc.title}
                  {doc.isRequired && <span style={{ color: '#DE350B', marginLeft: '4px' }}>*</span>}
                  {doc.feedback && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: token('color.text.danger', '#DE350B'),
                        marginTop: '4px',
                      }}
                    >
                      ⚠️ Phản hồi: {doc.feedback}
                    </div>
                  )}
                </td>

                <td style={{ padding: '14px 16px' }}>
                  {doc.fileName ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileIcon label="" />
                      <span style={{ fontSize: '13px', color: token('color.link', '#0052CC') }}>
                        {doc.fileName}
                      </span>
                      <span style={{ fontSize: '11px', color: token('color.text.subtlest', '#7A869A') }}>
                        ({doc.fileSize})
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', color: token('color.text.subtlest', '#7A869A') }}>
                      Chưa nộp tệp
                    </span>
                  )}
                </td>

                <td style={{ padding: '14px 16px' }}>
                  {doc.status === 'ok' && <Lozenge appearance="success">Hợp lệ</Lozenge>}
                  {doc.status === 'need_supplement' && <Lozenge appearance="removed">Cần bổ sung</Lozenge>}
                  {doc.status === 'pending' && <Lozenge appearance="default">Chờ kiểm tra</Lozenge>}
                  {doc.status === 'not_applicable' && <Lozenge appearance="new">Không áp dụng</Lozenge>}
                </td>

                <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '6px' }}>
                    <Button
                      spacing="compact"
                      appearance={doc.status === 'ok' ? 'primary' : 'default'}
                      onClick={() => handleDocumentVerdict(doc.id, 'ok')}
                    >
                      Đạt
                    </Button>
                    <Button
                      spacing="compact"
                      appearance={doc.status === 'need_supplement' ? 'danger' : 'subtle'}
                      onClick={() => handleDocumentVerdict(doc.id, 'need_supplement')}
                    >
                      Bổ sung
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* History Timeline */}
      <div
        style={{
          backgroundColor: token('elevation.surface', '#FFFFFF'),
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          borderRadius: '8px',
          padding: '20px',
        }}
      >
        <div style={{ fontSize: '15px', fontWeight: 600, color: token('color.text', '#172B4D'), marginBottom: '14px' }}>
          Nhật ký xử lý hồ sơ
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {caseData.history.map((hist) => (
            <div
              key={hist.id}
              style={{
                display: 'flex',
                gap: '14px',
                paddingBottom: '12px',
                borderBottom: `1px solid ${token('color.border', '#EBECF0')}`,
              }}
            >
              <div style={{ fontSize: '12px', color: token('color.text.subtle', '#5E6C84'), minWidth: '130px' }}>
                {hist.date}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: token('color.text', '#172B4D') }}>
                  {hist.action}
                </div>
                <div style={{ fontSize: '12px', color: token('color.text.subtlest', '#7A869A') }}>
                  Thực hiện bởi: {hist.actor} {hist.note ? `· ${hist.note}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal / Prompt for Supplement Request */}
      {showSupplementModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(9, 30, 66, 0.54)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              padding: '24px',
              width: '480px',
              maxWidth: '90%',
              boxShadow: '0 8px 16px rgba(9, 30, 66, 0.25)',
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 600, color: '#172B4D' }}>
              Yêu cầu sinh viên bổ sung giấy tờ
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#5E6C84' }}>
              Nhập nội dung hướng dẫn chi tiết để sinh viên biết cần chỉnh sửa hoặc tải lên giấy tờ nào:
            </p>
            <textarea
              rows={4}
              value={supplementNote}
              onChange={(e) => setSupplementNote(e.target.value)}
              placeholder="Ví dụ: Bảng điểm HK2 thiếu xác nhận đào tạo; Lý lịch cần dán ảnh giáp lai..."
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #DFE1E6',
                boxSizing: 'border-box',
                fontSize: '13.5px',
                outline: 'none',
                marginBottom: '20px',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button appearance="subtle" onClick={() => setShowSupplementModal(false)}>
                Huỷ bỏ
              </Button>
              <Button appearance="danger" onClick={handleRequestSupplement}>
                Xác nhận yêu cầu bổ sung
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
