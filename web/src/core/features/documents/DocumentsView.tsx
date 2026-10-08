import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';

export const DocumentsView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '4px' }}>
      {/* Header */}
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
            Văn bản
          </h1>
          <p style={{
            margin: '6px 0 0 0',
            fontSize: '14px',
            color: token('color.text.subtle', '#5E6C84')
          }}>
            Danh mục liên kết văn bản do các Tổ TCKT ban hành.
          </p>
        </div>

        <Button appearance="primary">
          + Thêm văn bản
        </Button>
      </div>

      {/* Toolbar: Search and Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1 1 320px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm văn bản..."
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
            defaultValue={{ label: 'Tất cả các năm', value: 'all' }}
            options={[
              { label: 'Tất cả các năm', value: 'all' },
              { label: '2026', value: '2026' },
              { label: '2025', value: '2025' }
            ]}
            onChange={(opt: any) => setYearFilter(opt?.value || 'all')}
          />
        </div>

        <div style={{ width: '180px' }}>
          <Select
            defaultValue={{ label: 'Tất cả các Tổ', value: 'all' }}
            options={[
              { label: 'Tất cả các Tổ', value: 'all' },
              { label: 'Phát triển Đảng và Chuyển đổi số', value: 'ptd_cds' },
              { label: 'Tổ chức và Phát triển Đoàn', value: 'tc_ptd' },
              { label: 'Giám sát, Kiểm tra và Điểm rèn luyện', value: 'gs_kt' },
              { label: 'Tuyên giáo - Truyền thông', value: 'tg_tt' }
            ]}
            onChange={(opt: any) => setTeamFilter(opt?.value || 'all')}
          />
        </div>
      </div>

      {/* Empty State Box */}
      <div style={{
        maxWidth: '560px',
        backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: '4px',
        padding: '20px 24px',
        boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)')
      }}>
        <div style={{
          fontSize: '15px',
          fontWeight: 600,
          color: token('color.text', '#172B4D'),
          marginBottom: '6px'
        }}>
          Không tìm thấy văn bản
        </div>
        <div style={{
          fontSize: '13px',
          color: token('color.text.subtle', '#5E6C84')
        }}>
          Hãy thêm văn bản đầu tiên hoặc thay đổi bộ lọc.
        </div>
      </div>
    </div>
  );
};
