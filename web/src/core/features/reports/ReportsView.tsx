import React, { useState, useMemo } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import CalendarIcon from '@atlaskit/icon/core/calendar';
import DownloadIcon from '@atlaskit/icon/core/download';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchTeams, downloadReportExport, type TeamItem } from '../../api';
import { formatVnDate, todayVnKey } from '../../../shared/utils/date';

const toIsoDate = (str: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return str;
};

export const ReportsView: React.FC = () => {
  const [startDate, setStartDate] = useState(() => formatVnDate(`${todayVnKey().slice(0, 8)}01`));
  const [endDate, setEndDate] = useState(() => formatVnDate(todayVnKey()));
  const [selectedTeam, setSelectedTeam] = useState('all');

  const { data: teams } = useQuery({
    queryKey: ['core-teams'],
    queryFn: fetchTeams,
  });

  const teamOptions = useMemo(() => {
    const list: TeamItem[] = teams || [];
    return [
      { label: 'Tất cả các Tổ có thể xem', value: 'all' },
      ...list.map((t) => ({ label: t.name, value: String(t.id) })),
    ];
  }, [teams]);

  // Dùng mutation để lỗi 401 đi qua MutationCache của App (quay về màn đăng nhập).
  const exportMutation = useMutation({
    mutationFn: ({ start, end }: { start: string; end: string }) =>
      downloadReportExport({
        start,
        end,
        team_id: selectedTeam !== 'all' ? selectedTeam : undefined,
        lang: 'vi',
      }),
    onSuccess: (blob, { start, end }) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bao-cao-${start}-${end}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Thu hồi ngay sau click có thể huỷ lượt tải trên Firefox/Safari.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    },
  });

  const handleExport = () => {
    exportMutation.mutate({ start: toIsoDate(startDate), end: toIsoDate(endDate) });
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '4px' }}>
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
          Báo cáo
        </h1>
        <p
          style={{
            margin: '6px 0 0 0',
            fontSize: '14px',
            color: token('color.text.subtle', '#5E6C84'),
          }}
        >
          Xuất dữ liệu hoạt động, công việc của Tổ và mức độ tham gia trong một khoảng thời gian.
        </p>
      </div>

      {/* Form Card */}
      <div
        style={{
          maxWidth: '640px',
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
        {/* Date Pickers Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div>
            <label
              htmlFor="start-date-input"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: token('color.text', '#172B4D'),
                marginBottom: '6px',
              }}
            >
              Ngày bắt đầu
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="start-date-input"
                aria-label="Ngày bắt đầu"
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 36px 0 12px',
                  border: `1px solid ${token('color.border', '#DFE1E6')}`,
                  borderRadius: '4px',
                  fontSize: '14px',
                  color: token('color.text', '#172B4D'),
                  backgroundColor: token('elevation.surface', '#FFFFFF'),
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '9px',
                  color: token('color.icon.subtle', '#6B778C'),
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <CalendarIcon label="" />
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="end-date-input"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: token('color.text', '#172B4D'),
                marginBottom: '6px',
              }}
            >
              Ngày kết thúc
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="end-date-input"
                aria-label="Ngày kết thúc"
                type="text"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 36px 0 12px',
                  border: `1px solid ${token('color.border', '#DFE1E6')}`,
                  borderRadius: '4px',
                  fontSize: '14px',
                  color: token('color.text', '#172B4D'),
                  backgroundColor: token('elevation.surface', '#FFFFFF'),
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '9px',
                  color: token('color.icon.subtle', '#6B778C'),
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <CalendarIcon label="" />
              </span>
            </div>
          </div>
        </div>

        {/* Team Select */}
        <div style={{ marginBottom: '20px' }}>
          <label
            htmlFor="team-select"
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: token('color.text', '#172B4D'),
              marginBottom: '6px',
            }}
          >
            Tổ
          </label>
          <Select
            inputId="team-select"
            aria-label="Tổ"
            defaultValue={{ label: 'Tất cả các Tổ có thể xem', value: 'all' }}
            options={teamOptions}
            onChange={(opt: any) => setSelectedTeam(opt?.value || 'all')}
          />
        </div>

        {/* Description Note */}
        <p
          style={{
            margin: '0 0 20px 0',
            fontSize: '14px',
            lineHeight: 1.5,
            color: token('color.text.subtle', '#5E6C84'),
          }}
        >
          Tệp Excel gồm tổng hợp hoạt động và chi tiết công việc, tham gia của thành viên đối với các hoạt động diễn ra trong khoảng thời gian này.
        </p>

        {/* Action Button & Export Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Button
            appearance="primary"
            onClick={handleExport}
            isDisabled={exportMutation.isPending}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <DownloadIcon label="" />
              <span>Xuất báo cáo Excel</span>
            </span>
          </Button>

          {exportMutation.isPending && (
            <span style={{ fontSize: '13px', color: token('color.text.subtle', '#5E6C84') }}>
              Đang tạo tệp Excel...
            </span>
          )}

          {exportMutation.isSuccess && (
            <span
              style={{
                fontSize: '13px',
                color: token('color.text.success', '#006644'),
                fontWeight: 500,
              }}
            >
              Đã tải tệp Excel.
            </span>
          )}

          {exportMutation.isError && (
            <span
              role="alert"
              style={{
                fontSize: '13px',
                color: token('color.text.danger', '#AE2E24'),
                fontWeight: 500,
              }}
            >
              {exportMutation.error instanceof Error
                ? exportMutation.error.message
                : 'Không xuất được báo cáo. Vui lòng thử lại.'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
