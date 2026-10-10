import React, { useState, useMemo } from 'react';
import { Button, Field, Select } from '../../../ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchTeams, downloadReportExport, type TeamItem } from '../../api';
import { formatVnDate, todayVnKey } from '../../../shared/utils/date';
import '../people/people.css';
import './reports.css';

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
    <div className="rep">
      <div className="ppl-head">
        <div>
          <h1 className="ppl-h1">Báo cáo</h1>
          <p className="ppl-sub">Xuất dữ liệu hoạt động, công việc của Tổ và mức độ tham gia trong một khoảng thời gian.</p>
        </div>
      </div>

      <div className="rep-card">
        <div className="rep-dates">
          <Field label="Ngày bắt đầu">
            <input type="text" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Ngày kết thúc">
            <input type="text" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>

        <Field label="Tổ">
          <Select value={selectedTeam} onChange={setSelectedTeam} options={teamOptions} />
        </Field>

        <p className="rep-note">
          Tệp Excel gồm tổng hợp hoạt động và chi tiết công việc, tham gia của thành viên đối với các hoạt động diễn ra trong khoảng thời gian này.
        </p>

        <div className="rep-actions">
          <Button variant="primary" onClick={handleExport} disabled={exportMutation.isPending}>
            <svg className="rep-icon" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
            </svg>
            <span>Xuất báo cáo Excel</span>
          </Button>
          {exportMutation.isPending && <span className="rep-status">Đang tạo tệp Excel...</span>}
          {exportMutation.isSuccess && <span className="rep-status rep-status--ok">Đã tải tệp Excel.</span>}
          {exportMutation.isError && (
            <span role="alert" className="rep-status rep-status--error">
              {exportMutation.error instanceof Error ? exportMutation.error.message : 'Không xuất được báo cáo. Vui lòng thử lại.'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
