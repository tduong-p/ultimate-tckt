import React, { useState, useMemo } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import CalendarIcon from '@atlaskit/icon/core/calendar';
import DownloadIcon from '@atlaskit/icon/core/download';
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
  QueryClientContext,
} from '@tanstack/react-query';
import { fetchTeams, getReportExportUrl, type TeamItem } from '../../api';

const defaultReportsQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const toIsoDate = (str: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return str;
};

export const ReportsViewContent: React.FC = () => {
  const [startDate, setStartDate] = useState('09/08/2026');
  const [endDate, setEndDate] = useState('10/08/2026');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [isExported, setIsExported] = useState(false);

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

  const exportUrl = useMemo(() => {
    return getReportExportUrl({
      start: toIsoDate(startDate),
      end: toIsoDate(endDate),
      team_id: selectedTeam !== 'all' ? selectedTeam : undefined,
      lang: 'vi',
    });
  }, [startDate, endDate, selectedTeam]);

  const handleExport = () => {
    setIsExported(true);
    if (typeof document !== 'undefined') {
      const link = document.createElement('a');
      link.href = exportUrl;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setTimeout(() => setIsExported(false), 3000);
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
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <DownloadIcon label="" />
              <span>Xuất báo cáo Excel</span>
            </span>
          </Button>

          <a
            href={exportUrl}
            download
            data-testid="export-direct-link"
            style={{
              fontSize: '13px',
              color: token('color.link', '#0052CC'),
              textDecoration: 'none',
            }}
          >
            Tải trực tiếp
          </a>

          {isExported && (
            <span
              style={{
                fontSize: '13px',
                color: token('color.text.success', '#006644'),
                fontWeight: 500,
              }}
            >
              Đang tạo tệp Excel...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const ReportsView: React.FC = () => {
  const queryClient = React.useContext(QueryClientContext);

  if (!queryClient) {
    return (
      <QueryClientProvider client={defaultReportsQueryClient}>
        <ReportsViewContent />
      </QueryClientProvider>
    );
  }

  return <ReportsViewContent />;
};
