import React, { useState, useMemo } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import Avatar from '@atlaskit/avatar';
import Badge from '@atlaskit/badge';
import Select from '@atlaskit/select';
import { CtdCase, CTD_KPIS, STATUS_CONFIG } from '../../data/ctdMockData';

interface InboxViewProps {
  cases: CtdCase[];
  onSelectCase: (caseId: number) => void;
}

export const InboxView: React.FC<InboxViewProps> = ({ cases, onSelectCase }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedUnit, setSelectedUnit] = useState('all');

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const matchSearch =
        c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.studentId.includes(searchQuery);

      const matchUnit = selectedUnit === 'all' || c.unit === selectedUnit;

      if (!matchSearch || !matchUnit) return false;

      if (selectedFilter === 'all') return true;
      if (selectedFilter === 'dt_checking') return c.status === 'dt_checking';
      if (selectedFilter === 'tckt_checking') return c.status === 'tckt_checking';
      if (selectedFilter === 'need_supplement') return c.status === 'need_supplement';
      if (selectedFilter === 'eligible') return c.status === 'eligible' || c.status === 'meeting_scheduled';
      if (selectedFilter === 'forwarded') return c.status === 'forwarded';
      if (selectedFilter === 'overdue') return c.daysInStatus > c.slaDays && c.slaDays > 0;

      return true;
    });
  }, [cases, searchQuery, selectedFilter, selectedUnit]);

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingTop: '4px' }}>
      {/* Header */}
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
          Hộp xử lý hồ sơ Đảng
        </h1>
        <p
          style={{
            margin: '6px 0 0 0',
            fontSize: '14px',
            color: token('color.text.subtle', '#5E6C84'),
          }}
        >
          Tiếp nhận, kiểm tra và chuyển tiếp các hồ sơ kết nạp và chuyển Đảng chính thức trong toàn trường.
        </p>
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

      {/* Toolbar: Search, Filters & Tabs */}
      <div
        style={{
          backgroundColor: token('elevation.surface', '#FFFFFF'),
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          borderRadius: '8px 8px 0 0',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Left: Filter Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'dt_checking', label: 'Chờ LCĐ duyệt' },
            { id: 'tckt_checking', label: 'Ban TCKT kiểm tra' },
            { id: 'need_supplement', label: 'Cần bổ sung' },
            { id: 'eligible', label: 'Đủ điều kiện' },
            { id: 'forwarded', label: 'Đã hoàn tất' },
            { id: 'overdue', label: 'Quá hạn SLA' },
          ].map((tab) => (
            <Button
              key={tab.id}
              appearance={selectedFilter === tab.id ? 'primary' : 'subtle'}
              spacing="compact"
              onClick={() => setSelectedFilter(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Right: Search & Unit Filter */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ width: '180px' }}>
            <Select
              spacing="compact"
              defaultValue={{ label: 'Tất cả Đơn vị', value: 'all' }}
              options={[
                { label: 'Tất cả Đơn vị', value: 'all' },
                { label: 'LCĐ Khoa CNTT', value: 'LCĐ Khoa CNTT' },
                { label: 'LCĐ Khoa Điện', value: 'LCĐ Khoa Điện' },
                { label: 'LCĐ Khoa Cơ khí', value: 'LCĐ Khoa Cơ khí' },
                { label: 'LCĐ Khoa Hoá', value: 'LCĐ Khoa Hoá' },
              ]}
              onChange={(opt: any) => setSelectedUnit(opt?.value || 'all')}
            />
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc MSSV..."
            style={{
              width: '220px',
              height: '36px',
              padding: '0 12px',
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: '4px',
              fontSize: '13px',
              color: token('color.text', '#172B4D'),
              backgroundColor: token('elevation.surface', '#FFFFFF'),
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Table Container */}
      <div
        style={{
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          overflowX: 'auto',
          backgroundColor: token('elevation.surface', '#FFFFFF'),
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '13.5px',
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: token('elevation.surface.sunken', '#F4F5F7'),
                borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
                color: token('color.text.subtle', '#5E6C84'),
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
              }}
            >
              <th style={{ padding: '12px 16px' }}>Ứng viên</th>
              <th style={{ padding: '12px 16px' }}>Đơn vị</th>
              <th style={{ padding: '12px 16px' }}>Loại hồ sơ</th>
              <th style={{ padding: '12px 16px' }}>Giấy tờ</th>
              <th style={{ padding: '12px 16px' }}>Trạng thái</th>
              <th style={{ padding: '12px 16px' }}>Thời gian / SLA</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredCases.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: '36px',
                    textAlign: 'center',
                    color: token('color.text.subtle', '#5E6C84'),
                  }}
                >
                  Không tìm thấy hồ sơ phù hợp với điều kiện tìm kiếm.
                </td>
              </tr>
            ) : (
              filteredCases.map((c) => {
                const isOverdue = c.daysInStatus > c.slaDays && c.slaDays > 0;
                const statusCfg = STATUS_CONFIG[c.status] || {
                  label: c.statusLabel,
                  appearance: 'default',
                };

                return (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: `1px solid ${token('color.border', '#EBECF0')}`,
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Avatar size="small" appearance="circle" name={c.fullName} />
                        <div>
                          <div
                            style={{
                              fontWeight: 600,
                              color: token('color.text', '#172B4D'),
                            }}
                          >
                            {c.fullName}
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: token('color.text.subtle', '#5E6C84'),
                            }}
                          >
                            {c.studentId} · {c.className}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', color: token('color.text', '#172B4D') }}>
                      {c.unit}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '12.5px',
                          fontWeight: 500,
                          color:
                            c.caseType === 'Kết nạp'
                              ? token('color.text.accent.blue', '#0052CC')
                              : token('color.text.accent.purple', '#5243AA'),
                        }}
                      >
                        {c.caseType}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Badge
                          appearance={
                            c.completedDocs === c.totalDocs ? 'primary' : 'important'
                          }
                        >
                          {c.completedDocs}/{c.totalDocs}
                        </Badge>
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <Lozenge appearance={statusCfg.appearance}>{statusCfg.label}</Lozenge>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontWeight: isOverdue ? 700 : 500,
                            color: isOverdue
                              ? token('color.text.danger', '#DE350B')
                              : token('color.text', '#172B4D'),
                          }}
                        >
                          {c.daysInStatus} ngày
                        </span>
                        {c.slaDays > 0 && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: token('color.text.subtlest', '#7A869A'),
                            }}
                          >
                            / {c.slaDays}d
                          </span>
                        )}
                        {isOverdue && (
                          <Lozenge appearance="removed">Trễ SLA</Lozenge>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <Button
                        appearance="primary"
                        spacing="compact"
                        onClick={() => onSelectCase(c.id)}
                      >
                        Thẩm định
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
