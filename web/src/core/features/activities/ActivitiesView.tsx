import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import Lozenge from '@atlaskit/lozenge';
import { CreateActivityModal } from '../dashboard/CreateActivityModal';

export const ActivitiesView: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '4px' }}>
      {/* Header with Title and Action Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: 600,
            color: token('color.text', '#172B4D'),
            letterSpacing: '-0.2px'
          }}>
            Hoạt động
          </h1>
          <p style={{
            margin: '6px 0 0 0',
            fontSize: '14px',
            color: token('color.text.subtle', '#5E6C84')
          }}>
            Lập kế hoạch, phối hợp và theo dõi mọi hoạt động.
          </p>
        </div>

        <Button
          appearance="primary"
          onClick={() => setIsModalOpen(true)}
        >
          + Đề xuất hoạt động
        </Button>
      </div>

      {/* Search and Filters Bar */}
      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        marginBottom: '28px',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1 1 300px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm hoạt động..."
            style={{
              width: '100%',
              height: '38px',
              padding: '0 12px',
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: '4px',
              fontSize: '14px',
              color: token('color.text', '#172B4D'),
              backgroundColor: token('elevation.surface', '#FFFFFF'),
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ width: '180px' }}>
          <Select
            defaultValue={{ label: 'Tất cả trạng thái', value: 'all' }}
            options={[
              { label: 'Tất cả trạng thái', value: 'all' },
              { label: 'Đề xuất', value: 'proposed' },
              { label: 'Đã duyệt', value: 'approved' },
              { label: 'Đang diễn ra', value: 'in_progress' },
              { label: 'Hoàn thành', value: 'completed' }
            ]}
            onChange={(opt: any) => setStatusFilter(opt?.value || 'all')}
          />
        </div>

        <div style={{ width: '180px' }}>
          <Select
            defaultValue={{ label: 'Tất cả loại', value: 'all' }}
            options={[
              { label: 'Tất cả loại', value: 'all' },
              { label: 'Sự kiện do đơn vị đề xuất', value: 'unit_proposed' },
              { label: 'Chỉ đạo cấp trên', value: 'directive' }
            ]}
            onChange={(opt: any) => setTypeFilter(opt?.value || 'all')}
          />
        </div>
      </div>

      {/* Activities Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 420px))',
        gap: '20px'
      }}>
        {/* Activity Card Example */}
        <div style={{
          backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          borderRadius: '6px',
          overflow: 'hidden',
          boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'),
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}>
          {/* Top Blue Accent Bar */}
          <div style={{
            height: '4px',
            backgroundColor: token('color.background.brand.bold', '#0052CC'),
            width: '100%'
          }} />

          {/* Card Body */}
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
            {/* Header Tags & Status */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '8px',
              marginBottom: '10px'
            }}>
              <div style={{
                fontSize: '11px',
                color: token('color.text.subtle', '#5E6C84'),
                lineHeight: '1.4',
                flex: 1
              }}>
                <span style={{ color: token('color.icon.brand', '#0052CC'), marginRight: '4px' }}>•</span>
                Giám sát, Kiểm tra và Điểm rèn luyện, Phát triển Đảng và Chuyển đổi số, Tổ chức và Phát triển Đoàn
              </div>
              <Lozenge appearance="success">
                • Đã Duyệt
              </Lozenge>
            </div>

            {/* Title */}
            <h2 style={{
              margin: '0 0 8px 0',
              fontSize: '15px',
              fontWeight: 600,
              color: token('color.text', '#172B4D'),
              lineHeight: '1.4'
            }}>
              Triển khai tạo tài khoản chi đoàn K71 &amp; Hướng dẫn Đoàn viên chuyển sinh hoạt trên QLDV
            </h2>

            {/* Description Snippet */}
            <p style={{
              margin: '0 0 16px 0',
              fontSize: '13px',
              color: token('color.text.subtle', '#5E6C84'),
              lineHeight: '1.4'
            }}>
              Triển khai tạo tài khoản chi đoàn K71 &amp; Hướng dẫn Đoàn viên chuyển sinh hoạt trên QLDV
            </p>

            {/* Footer Metadata */}
            <div style={{
              marginTop: 'auto',
              paddingTop: '12px',
              fontSize: '12px',
              color: token('color.text.subtle', '#6B778C'),
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>Sự kiện đơn vị</span>
              <span>•</span>
              <span>0 người</span>
              <span>•</span>
              <span>09 thg 8, 2026</span>
            </div>

            {/* Progress Bar Line */}
            <div style={{
              marginTop: '10px',
              height: '4px',
              backgroundColor: token('color.background.neutral', '#DFE1E6'),
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: '45%',
                height: '100%',
                backgroundColor: token('color.background.brand.bold', '#0052CC'),
                borderRadius: '2px'
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Propose Activity Modal */}
      <CreateActivityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
