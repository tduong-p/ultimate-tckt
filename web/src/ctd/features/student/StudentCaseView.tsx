import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import Badge from '@atlaskit/badge';
import FileIcon from '@atlaskit/icon/core/file';
import CloudArrowUpIcon from '@atlaskit/icon/core/cloud-arrow-up';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import { CtdCase, DocumentItem } from '../../data/ctdMockData';

interface StudentCaseViewProps {
  myCase: CtdCase;
  initialMode?: 'status' | 'submit';
}

export const StudentCaseView: React.FC<StudentCaseViewProps> = ({
  myCase,
  initialMode = 'status',
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'submit'>(initialMode);
  const [documents, setDocuments] = useState<DocumentItem[]>(myCase.documents);
  const [uploadedMsg, setUploadedMsg] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Form states for S3
  const [caseType, setCaseType] = useState('Kết nạp');
  const [unit, setUnit] = useState('LCĐ Khoa CNTT');

  const handleReupload = (docId: number) => {
    setDocuments((docs) =>
      docs.map((d) =>
        d.id === docId
          ? {
              ...d,
              status: 'pending',
              feedback: undefined,
              fileName: `${d.title.replace(/\s+/g, '_')}_Bổ_sung.pdf`,
              fileSize: '1.5 MB',
            }
          : d
      )
    );
    setUploadedMsg('Đã tải lên tệp bổ sung thành công! Cán bộ sẽ rà soát lại.');
    setTimeout(() => setUploadedMsg(null), 3000);
  };

  const handleSubmitNewCase = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccess(true);
    setTimeout(() => {
      setSubmitSuccess(false);
      setActiveTab('status');
    }, 2000);
  };

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', paddingTop: '4px' }}>
      {/* Header & Tabs */}
      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: 600,
            color: token('color.text', '#172B4D'),
            letterSpacing: '-0.2px',
          }}
        >
          Cổng nộp & theo dõi hồ sơ Đảng
        </h1>
        <p
          style={{
            margin: '6px 0 0 0',
            fontSize: '14px',
            color: token('color.text.subtle', '#5E6C84'),
          }}
        >
          Dành cho Đoàn viên ưu tú & Đảng viên dự bị theo dõi tiến độ xét kết nạp và chuyển Đảng.
        </p>

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <Button
            appearance={activeTab === 'status' ? 'primary' : 'default'}
            onClick={() => setActiveTab('status')}
          >
            Trạng thái hồ sơ của tôi
          </Button>
          <Button
            appearance={activeTab === 'submit' ? 'primary' : 'default'}
            onClick={() => setActiveTab('submit')}
          >
            Nộp hồ sơ Đảng mới
          </Button>
        </div>
      </div>

      {uploadedMsg && (
        <div
          style={{
            backgroundColor: token('color.background.success', '#E3FCEF'),
            color: token('color.text.success', '#006644'),
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          ✓ {uploadedMsg}
        </div>
      )}

      {activeTab === 'status' ? (
        <div>
          {/* Status Alert Banner */}
          {myCase.status === 'need_supplement' && (
            <div
              style={{
                backgroundColor: '#FFEBE6',
                border: '1px solid #FFBDAD',
                borderRadius: '8px',
                padding: '16px 20px',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>⚠️</span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#DE350B' }}>
                  Yêu cầu bổ sung tài liệu
                </span>
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '13.5px', color: '#BF2600', lineHeight: 1.5 }}>
                Cán bộ phụ trách yêu cầu bạn kiểm tra lại các giấy tờ được đánh dấu đỏ bên dưới. Vui lòng cập nhật sớm trước thời hạn quy định (2 ngày).
              </p>
            </div>
          )}

          {/* Case Overview Card */}
          <div
            style={{
              backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: '8px',
              padding: '24px',
              marginBottom: '24px',
              boxShadow: token(
                'elevation.shadow.raised',
                '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'
              ),
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', color: token('color.text.subtle', '#5E6C84') }}>
                  Hồ sơ đang xử lý
                </div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: token('color.text', '#172B4D'), marginTop: '2px' }}>
                  Xét {myCase.caseType} Đảng · {myCase.fullName}
                </div>
              </div>
              <Lozenge appearance={myCase.status === 'need_supplement' ? 'moved' : 'inprogress'}>
                {myCase.statusLabel}
              </Lozenge>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                paddingTop: '16px',
                borderTop: `1px solid ${token('color.border', '#EBECF0')}`,
              }}
            >
              <div>
                <div style={{ fontSize: '12px', color: token('color.text.subtle', '#5E6C84') }}>Mã hồ sơ</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: token('color.text', '#172B4D') }}>
                  {myCase.code}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: token('color.text.subtle', '#5E6C84') }}>Đơn vị tiếp nhận</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: token('color.text', '#172B4D') }}>
                  {myCase.unit}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: token('color.text.subtle', '#5E6C84') }}>Ngày nộp</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: token('color.text', '#172B4D') }}>
                  {myCase.submittedDate}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: token('color.text.subtle', '#5E6C84') }}>Cập nhật lần cuối</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: token('color.text', '#172B4D') }}>
                  {myCase.updatedDate}
                </div>
              </div>
            </div>
          </div>

          {/* Documents Section */}
          <div
            style={{
              backgroundColor: token('elevation.surface', '#FFFFFF'),
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                backgroundColor: token('elevation.surface.sunken', '#F4F5F7'),
                borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: 600, color: token('color.text', '#172B4D') }}>
                Tài liệu & Giấy tờ trong hồ sơ ({documents.length})
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
                    color: token('color.text.subtle', '#5E6C84'),
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <th style={{ padding: '12px 20px', textAlign: 'left' }}>Tên giấy tờ</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Tệp hiện tại</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Trạng thái</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    style={{
                      borderBottom: `1px solid ${token('color.border', '#EBECF0')}`,
                      backgroundColor:
                        doc.status === 'need_supplement' ? '#FFFAF8' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '14px 20px', fontWeight: 500, color: token('color.text', '#172B4D') }}>
                      {doc.title}
                      {doc.feedback && (
                        <div
                          style={{
                            fontSize: '12px',
                            color: token('color.text.danger', '#DE350B'),
                            marginTop: '4px',
                            fontWeight: 600,
                          }}
                        >
                          ⚠️ {doc.feedback}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileIcon label="" />
                        <span style={{ fontSize: '13px', color: token('color.link', '#0052CC') }}>
                          {doc.fileName}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      {doc.status === 'ok' && <Lozenge appearance="success">Hợp lệ</Lozenge>}
                      {doc.status === 'need_supplement' && <Lozenge appearance="removed">Cần nộp lại</Lozenge>}
                      {doc.status === 'pending' && <Lozenge appearance="inprogress">Chờ duyệt</Lozenge>}
                    </td>

                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      {doc.status === 'need_supplement' ? (
                        <Button
                          appearance="primary"
                          spacing="compact"
                          onClick={() => handleReupload(doc.id)}
                        >
                          Tải lên bản sửa đổi
                        </Button>
                      ) : (
                        <Button appearance="subtle" spacing="compact">
                          Xem tệp
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Form Submit Case S3 */
        <div
          style={{
            backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: '8px',
            padding: '24px',
            boxShadow: token(
              'elevation.shadow.raised',
              '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'
            ),
          }}
        >
          <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: token('color.text', '#172B4D') }}>
            Đăng ký nộp hồ sơ Đảng
          </h2>
          <p style={{ margin: '0 0 24px 0', fontSize: '13.5px', color: token('color.text.subtle', '#5E6C84') }}>
            Vui lòng điền thông tin và chuẩn bị đầy đủ các văn bản đính kèm theo định dạng PDF hoặc ảnh chất lượng cao.
          </p>

          <form onSubmit={handleSubmitNewCase}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: token('color.text', '#172B4D'), marginBottom: '6px' }}>
                  Loại hồ sơ đăng ký *
                </label>
                <select
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 10px',
                    border: `1px solid ${token('color.border', '#DFE1E6')}`,
                    borderRadius: '4px',
                    backgroundColor: '#FFFFFF',
                    fontSize: '14px',
                  }}
                >
                  <option value="Kết nạp">Xét kết nạp Đảng</option>
                  <option value="Chuyển chính thức">Xét chuyển Đảng chính thức</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: token('color.text', '#172B4D'), marginBottom: '6px' }}>
                  Đơn vị Đoàn / LCĐ trực thuộc *
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 10px',
                    border: `1px solid ${token('color.border', '#DFE1E6')}`,
                    borderRadius: '4px',
                    backgroundColor: '#FFFFFF',
                    fontSize: '14px',
                  }}
                >
                  <option value="LCĐ Khoa CNTT">LCĐ Khoa CNTT</option>
                  <option value="LCĐ Khoa Điện">LCĐ Khoa Điện</option>
                  <option value="LCĐ Khoa Cơ khí">LCĐ Khoa Cơ khí</option>
                  <option value="LCĐ Khoa Hoá">LCĐ Khoa Hoá</option>
                </select>
              </div>
            </div>

            {/* Checklist of required files */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: token('color.text', '#172B4D'), marginBottom: '10px' }}>
                Danh sách tệp tài liệu cần nộp:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  '1. Đơn xin vào Đảng (viết tay, có chữ ký)',
                  '2. Lý lịch của người xin vào Đảng (khai chi tiết 3 đời)',
                  '3. Giấy chứng nhận hoàn thành lớp bồi dưỡng nhận thức Đảng',
                  '4. Bảng điểm học tập tích luỹ (có mộc đỏ phòng Đào tạo)',
                  '5. Xác nhận của Ban Chấp hành Chi đoàn',
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: token('elevation.surface.sunken', '#F4F5F7'),
                      borderRadius: '6px',
                    }}
                  >
                    <span style={{ fontSize: '13.5px', color: token('color.text', '#172B4D') }}>{item}</span>
                    <Button spacing="compact" appearance="subtle">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CloudArrowUpIcon label="" />
                        <span>Chọn tệp</span>
                      </span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button appearance="subtle" onClick={() => setActiveTab('status')}>
                Huỷ bỏ
              </Button>
              <Button appearance="primary" type="submit">
                {submitSuccess ? '✓ Đang gửi...' : 'Gửi hồ sơ xét duyệt'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
