import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import DownloadIcon from '@atlaskit/icon/core/download';
import {
  CTD_KPIS,
  CTD_STAGE_DISTRIBUTION,
  CTD_BACKLOG_ITEMS,
} from '../../data/ctdMockData';

export const CtdDashboardView: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [urgedItems, setUrgedItems] = useState<Record<string, boolean>>({});

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => setIsExporting(false), 2500);
  };

  const handleUrge = (mssv: string) => {
    setUrgedItems((prev) => ({ ...prev, [mssv]: true }));
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingTop: '4px' }}>
      {/* Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#0052CC',
                backgroundColor: '#DEEBFF',
                padding: '2px 8px',
                borderRadius: '3px',
              }}
            >
              C6 · BÁO CÁO TOÀN TRƯỜNG
            </span>
          </div>
          <h1
            style={{
              margin: '8px 0 0 0',
              fontSize: '24px',
              fontWeight: 600,
              color: token('color.text', '#172B4D'),
              letterSpacing: '-0.2px',
            }}
          >
            Toàn cảnh đợt xét Đảng 2026-2
          </h1>
          <p
            style={{
              margin: '6px 0 0 0',
              fontSize: '14px',
              color: token('color.text.subtle', '#5E6C84'),
            }}
          >
            Giám sát thời gian thực tiến độ xét nạp & chuyển chính thức · Trả lời câu hỏi tồn bao nhiêu, tồn ở đâu.
          </p>
        </div>

        <Button appearance="primary" onClick={handleExport}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <DownloadIcon label="" />
            <span>{isExporting ? 'Đang tạo báo cáo...' : 'Xuất báo cáo tổng hợp'}</span>
          </span>
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {CTD_KPIS.map((kpi, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: '8px',
              padding: '18px 20px',
              boxShadow: token(
                'elevation.shadow.raised',
                '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'
              ),
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: token('color.text.subtle', '#5E6C84'),
                marginBottom: '8px',
              }}
            >
              {kpi.label}
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color:
                  kpi.tone === 'warn'
                    ? token('color.text.danger', '#DE350B')
                    : token('color.text', '#172B4D'),
                lineHeight: 1.1,
                marginBottom: '6px',
              }}
            >
              {kpi.value}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: token('color.text.subtlest', '#7A869A'),
              }}
            >
              {kpi.note}
            </div>
          </div>
        ))}
      </div>

      {/* Stage Distribution Section */}
      <div
        style={{
          backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '28px',
          boxShadow: token(
            'elevation.shadow.raised',
            '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'
          ),
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: token('color.text', '#172B4D') }}>
              Phân bổ hồ sơ theo các giai đoạn xét
            </div>
            <div style={{ fontSize: '13px', color: token('color.text.subtle', '#5E6C84'), marginTop: '2px' }}>
              Tổng cộng 184 hồ sơ đang lưu thông qua các cấp duyệt
            </div>
          </div>
        </div>

        {/* Multi-segmented Progress Bar */}
        <div
          style={{
            display: 'flex',
            height: '24px',
            borderRadius: '6px',
            overflow: 'hidden',
            backgroundColor: '#EBECF0',
            marginBottom: '18px',
          }}
        >
          {CTD_STAGE_DISTRIBUTION.map((stage, idx) => (
            <div
              key={idx}
              title={`${stage.label}: ${stage.count} hồ sơ (${stage.percentage}%)`}
              style={{
                width: `${stage.percentage}%`,
                backgroundColor: stage.color,
                transition: 'width 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          {CTD_STAGE_DISTRIBUTION.map((stage, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
              }}
            >
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '3px',
                  backgroundColor: stage.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: token('color.text', '#172B4D'), fontWeight: 500 }}>
                {stage.label}:
              </span>
              <span style={{ color: token('color.text.subtle', '#5E6C84') }}>
                {stage.count} ({stage.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* SLA Backlog Section */}
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
          <div>
            <span style={{ fontSize: '15px', fontWeight: 600, color: token('color.text', '#172B4D') }}>
              Hồ sơ trễ hạn quy định (SLA Backlog)
            </span>
            <span style={{ marginLeft: '8px' }}>
              <Lozenge appearance="removed">23 hồ sơ</Lozenge>
            </span>
          </div>
          <div style={{ fontSize: '13px', color: token('color.text.subtle', '#5E6C84') }}>
            Cần Ban TCKT & Cán bộ đơn vị phối hợp xử lý gấp
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
              <th style={{ padding: '12px 20px', textAlign: 'left' }}>Ứng viên</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Đơn vị phụ trách</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Giai đoạn đang dừng</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Số ngày quá hạn</th>
              <th style={{ padding: '12px 20px', textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {CTD_BACKLOG_ITEMS.map((item) => (
              <tr
                key={item.mssv}
                style={{
                  borderBottom: `1px solid ${token('color.border', '#EBECF0')}`,
                }}
              >
                <td style={{ padding: '14px 20px', fontWeight: 600, color: token('color.text', '#172B4D') }}>
                  <div>{item.name}</div>
                  <div style={{ fontSize: '12px', fontWeight: 400, color: token('color.text.subtle', '#5E6C84') }}>
                    {item.mssv}
                  </div>
                </td>
                <td style={{ padding: '14px 16px', color: token('color.text', '#172B4D') }}>
                  {item.unit}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <Lozenge appearance="inprogress">{item.status}</Lozenge>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontWeight: 700, color: token('color.text.danger', '#DE350B') }}>
                    +{item.daysOverdue} ngày
                  </span>
                </td>
                <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                  <Button
                    spacing="compact"
                    appearance={urgedItems[item.mssv] ? 'default' : 'danger'}
                    onClick={() => handleUrge(item.mssv)}
                  >
                    {urgedItems[item.mssv] ? '✓ Đã gửi đôn đốc' : 'Gửi đôn đốc'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
