import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Badge, Button, StatusIcon, type Status } from '../../../ui';
import { apiErrorMessage, fetchTeamOverview } from '../../api';
import { useCapabilities } from '../../capabilities';
import { teamOverviewKey } from '../../queryKeys';
import { useToast } from '../../../shared/components/Toast';
import { formatVnDate, todayVnKey, toVnDateKey } from '../../../shared/utils/date';
import { getActivityStatusMeta } from '../activities/activityLabels';
import { getTaskStatusLabel } from '../tasks/taskLabels';
import { PeopleConfirmDialog } from '../people/peopleKit';
import { TeamMembersModal } from './TeamMembersModal';
import { useDeleteTeam } from './useDeleteTeam';
import './teams.css';

const percent = (done: number, total: number) => (total > 0 ? Math.round((done / total) * 100) : 0);
const toStatus = (s: string): Status => (s === 'in_progress' || s === 'review' || s === 'done' || s === 'cancelled' ? s : 'todo');
const TONE = { default: 'neutral', moved: 'warning', success: 'success', inprogress: 'info', removed: 'danger', new: 'info' } as const;

const Kpi: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="team-kpi">
    <div className="team-kpi-label">{label}</div>
    <div className="team-kpi-value">{value}</div>
  </div>
);

export const TeamPage: React.FC = () => {
  const { id } = useParams();
  const teamId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();
  const caps = useCapabilities();
  const [managing, setManaging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteMutation = useDeleteTeam(() => { setDeleting(false); navigate('/teams'); });
  const { data, isLoading, error } = useQuery({
    queryKey: teamOverviewKey(teamId),
    queryFn: () => fetchTeamOverview(teamId),
    enabled: Number.isInteger(teamId) && teamId > 0,
  });

  // Server chỉ cho admin hoặc người quản lý Tổ xem trang này; 403 thì về Tổng quan như mọi route không có quyền.
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  useEffect(() => {
    if (status === 403) {
      toast.error(apiErrorMessage(error));
      navigate('/dashboard', { replace: true });
    }
  }, [status, error, navigate, toast]);

  const back = <Link className="team-back" to="/teams">← Quay lại danh sách Tổ</Link>;

  if (isLoading) return <p className="ppl-state" role="status">Đang tải trang Tổ...</p>;
  if (error != null) {
    return (
      <div className="team">
        {back}
        <p role="alert" className="ppl-state ppl-state--error">{apiErrorMessage(error, 'Không tải được trang Tổ.')}</p>
      </div>
    );
  }
  if (!data) return null;

  const { team, members, tasks, activities } = data;
  const today = todayVnKey();
  const openTasks = tasks.filter((t) => t.status !== 'done');

  return (
    <div className="team">
      {back}
      <header className="ppl-head">
        <div>
          <h1 className="ppl-h1">{team.name}</h1>
          <p className="ppl-sub">{team.description || 'Chưa có mô tả.'}</p>
        </div>
        <div className="team-actions">
          <Button onClick={() => setManaging(true)}>Quản lý thành viên</Button>
          {caps.isExec && <Button variant="danger" onClick={() => setDeleting(true)}>Xoá Tổ</Button>}
        </div>
      </header>

      <div className="team-kpis">
        <Kpi label="Thành viên" value={team.member_count} />
        <Kpi label="Việc đang mở" value={team.open_tasks} />
        <Kpi label="Quá hạn" value={team.overdue_tasks} />
        <Kpi label="Tiến độ" value={`${percent(Number(team.done_tasks), Number(team.open_tasks) + Number(team.done_tasks))}%`} />
      </div>

      <div className="team-layout">
        <div>
          <section className="team-section">
            <h2 className="team-h2">Công việc hiện tại ({openTasks.length})</h2>
            {openTasks.length === 0 && <p className="ppl-muted">Chưa có việc nào.</p>}
            {openTasks.map((t) => {
              const late = toVnDateKey(t.deadline) !== '' && toVnDateKey(t.deadline) < today;
              return (
                <Link key={t.id} to={`/task/${t.id}`} className="team-row">
                  <StatusIcon status={toStatus(t.status)} title={getTaskStatusLabel(t.status)} />
                  <span className="team-row-main">
                    <span className="team-row-title">{t.title}</span>
                    <span className="team-row-meta">{t.activity_title} · {t.assignee_name || 'Chưa giao'}</span>
                  </span>
                  <span className="team-row-side">
                    <span className={late ? 'team-late' : undefined}>{formatVnDate(t.deadline)}</span>
                  </span>
                </Link>
              );
            })}
          </section>

          <section className="team-section">
            <h2 className="team-h2">Hoạt động của Tổ ({activities.length})</h2>
            {activities.length === 0 && <p className="ppl-muted">Chưa có hoạt động nào.</p>}
            {activities.map((a) => {
              const meta = getActivityStatusMeta(a.status);
              return (
                <Link key={a.id} to={`/activity/${a.id}`} className="team-row">
                  <span className="team-row-main">
                    <span className="team-row-title">{a.title}</span>
                    <span className="team-row-meta">{a.done_count}/{a.task_count} việc · {formatVnDate(a.deadline)}</span>
                    <span className="team-progress" aria-hidden="true">
                      <span style={{ width: `${percent(a.done_count, a.task_count)}%` }} />
                    </span>
                  </span>
                  <span className="team-row-side"><Badge tone={TONE[meta.appearance]}>{meta.label}</Badge></span>
                </Link>
              );
            })}
          </section>
        </div>

        <aside className="team-section">
          <h2 className="team-h2">Thành viên ({members.length})</h2>
          {members.length === 0 && <p className="ppl-muted">Chưa có thành viên.</p>}
          {members.map((m) => (
            <div key={m.id} className="team-member">
              <Avatar name={m.name} size={28} />
              <div>
                <div className="team-member-name">
                  {m.name}
                  {m.is_lead ? <Badge tone="info">Tổ trưởng</Badge> : m.is_vice_lead ? <Badge tone="neutral">Tổ phó</Badge> : null}
                </div>
                <div className="team-member-meta">{m.open_tasks} đang mở · {m.done_tasks} đã xong</div>
                <div className="team-member-mail"><a href={`mailto:${m.email}`}>{m.email}</a></div>
              </div>
            </div>
          ))}
        </aside>
      </div>

      {managing && <TeamMembersModal teamId={teamId} teamName={team.name} onClose={() => setManaging(false)} />}
      <PeopleConfirmDialog
        open={deleting}
        title={`Xoá Tổ ${team.name}`}
        danger
        confirmLabel="Xoá Tổ vĩnh viễn"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(teamId)}
        onCancel={() => setDeleting(false)}
      >
        <p>Tổ sẽ bị xoá nếu không còn dữ liệu liên quan, nếu còn thì được lưu trữ. Không thể hoàn tác.</p>
      </PeopleConfirmDialog>
    </div>
  );
};
