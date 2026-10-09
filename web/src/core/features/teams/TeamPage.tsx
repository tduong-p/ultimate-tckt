import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import { useQuery } from '@tanstack/react-query';
import { apiErrorMessage, fetchTeamOverview } from '../../api';
import { useCapabilities } from '../../capabilities';
import { teamOverviewKey } from '../../queryKeys';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useToast } from '../../../shared/components/Toast';
import { formatVnDate, todayVnKey, toVnDateKey } from '../../../shared/utils/date';
import { getActivityStatusMeta } from '../activities/activityLabels';
import { getTaskStatusAppearance, getTaskStatusLabel } from '../tasks/taskLabels';
import { TeamMembersModal } from './TeamMembersModal';
import { useDeleteTeam } from './useDeleteTeam';

const panel: React.CSSProperties = {
  backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
  border: `1px solid ${token('color.border', '#DFE1E6')}`,
  borderRadius: 6,
  padding: 16,
};

const percent = (done: number, total: number) => (total > 0 ? Math.round((done / total) * 100) : 0);

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ ...panel, flex: '1 1 140px' }}>
    <div style={{ fontSize: 12, color: token('color.text.subtle', '#5E6C84') }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
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

  const back = (
    <Link to="/teams" style={{ color: token('color.link', '#0052CC') }}>← Quay lại danh sách Tổ</Link>
  );

  if (isLoading) return <LottieLoading message="Đang tải trang Tổ..." size={140} />;
  if (error != null) {
    return (
      <div>
        {back}
        <p role="alert" style={{ color: token('color.text.danger', '#AE2E24') }}>{apiErrorMessage(error, 'Không tải được trang Tổ.')}</p>
      </div>
    );
  }
  if (!data) return null;

  const { team, members, tasks, activities } = data;
  const today = todayVnKey();
  const openTasks = tasks.filter((t) => t.status !== 'done');

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {back}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', margin: '12px 0 20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>{team.name}</h1>
          <p style={{ margin: '6px 0 0', color: token('color.text.subtle', '#5E6C84') }}>{team.description || 'Chưa có mô tả.'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => setManaging(true)}>Quản lý thành viên</Button>
          {caps.isExec && <Button appearance="danger" onClick={() => setDeleting(true)}>Xoá Tổ</Button>}
        </div>
      </header>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <Stat label="Thành viên" value={team.member_count} />
        <Stat label="Việc đang mở" value={team.open_tasks} />
        <Stat label="Quá hạn" value={team.overdue_tasks} />
        <Stat label="Tiến độ" value={`${percent(Number(team.done_tasks), Number(team.open_tasks) + Number(team.done_tasks))}%`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section style={panel}>
            <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Công việc hiện tại ({openTasks.length})</h2>
            {openTasks.length === 0 && <p>Chưa có việc nào.</p>}
            {openTasks.map((t) => {
              const late = toVnDateKey(t.deadline) !== '' && toVnDateKey(t.deadline) < today;
              return (
                <Link key={t.id} to={`/task/${t.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', textDecoration: 'none', color: 'inherit', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` }}>
                  <span>
                    <strong>{t.title}</strong>
                    <small style={{ display: 'block', color: token('color.text.subtle', '#5E6C84') }}>{t.activity_title} · {t.assignee_name || 'Chưa giao'}</small>
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <Lozenge appearance={getTaskStatusAppearance(t.status)}>{getTaskStatusLabel(t.status)}</Lozenge>
                    <small style={{ display: 'block', color: late ? token('color.text.danger', '#AE2E24') : token('color.text.subtle', '#5E6C84') }}>{formatVnDate(t.deadline)}</small>
                  </span>
                </Link>
              );
            })}
          </section>

          <section style={panel}>
            <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Hoạt động của Tổ ({activities.length})</h2>
            {activities.length === 0 && <p>Chưa có hoạt động nào.</p>}
            {activities.map((a) => {
              const meta = getActivityStatusMeta(a.status);
              return (
                <Link key={a.id} to={`/activity/${a.id}`} style={{ display: 'block', padding: '8px 0', textDecoration: 'none', color: 'inherit', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong>{a.title}</strong>
                    <Lozenge appearance={meta.appearance}>{meta.label}</Lozenge>
                  </div>
                  <small style={{ color: token('color.text.subtle', '#5E6C84') }}>{a.done_count}/{a.task_count} việc · {formatVnDate(a.deadline)}</small>
                  <div style={{ height: 4, background: token('color.background.neutral', '#F1F2F4'), borderRadius: 2, marginTop: 4 }}>
                    <div style={{ height: 4, borderRadius: 2, width: `${percent(a.done_count, a.task_count)}%`, background: token('color.background.brand.bold', '#0052CC') }} />
                  </div>
                </Link>
              );
            })}
          </section>
        </div>

        <aside style={panel}>
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Thành viên ({members.length})</h2>
          {members.length === 0 && <p>Chưa có thành viên.</p>}
          {members.map((m) => (
            <div key={m.id} style={{ display: 'flex', gap: 10, padding: '8px 0' }}>
              <div aria-hidden="true" style={{ width: 32, height: 32, borderRadius: '50%', background: m.avatar_color || '#0052CC', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {m.name.trim().slice(0, 1).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>
                  {m.name}{' '}
                  {m.is_lead ? <Lozenge appearance="inprogress">Tổ trưởng</Lozenge> : m.is_vice_lead ? <Lozenge appearance="new">Tổ phó</Lozenge> : null}
                </div>
                <small style={{ color: token('color.text.subtle', '#5E6C84') }}>{m.open_tasks} đang mở · {m.done_tasks} đã xong</small>
                <div><a href={`mailto:${m.email}`} style={{ color: token('color.link', '#0052CC') }}>{m.email}</a></div>
              </div>
            </div>
          ))}
        </aside>
      </div>

      {managing && <TeamMembersModal teamId={teamId} teamName={team.name} onClose={() => setManaging(false)} />}
      <ConfirmDialog
        isOpen={deleting}
        title={`Xoá Tổ ${team.name}`}
        appearance="danger"
        confirmLabel="Xoá Tổ vĩnh viễn"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(teamId)}
        onCancel={() => setDeleting(false)}
      >
        <p>Tổ sẽ bị xoá nếu không còn dữ liệu liên quan, nếu còn thì được lưu trữ. Không thể hoàn tác.</p>
      </ConfirmDialog>
    </div>
  );
};
