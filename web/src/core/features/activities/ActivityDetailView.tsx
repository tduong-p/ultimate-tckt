// web/src/core/features/activities/ActivityDetailView.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import { apiErrorMessage, fetchActivityDetail } from '../../api';
import { activityDetailKey } from './activityKeys';
import { ActivityPlanSection } from './ActivityPlanSection';
import { ActivityActions } from './ActivityActions';
import { ActivityTaskActions } from '../tasks/ActivityTaskActions';
import { ActivityUpdatesSection } from './ActivityUpdatesSection';
import { useCapabilities } from '../../capabilities';
import {
  ActivityDetailsCard,
  ActivityGeneralInfo,
  ActivityHero,
  ActivityParticipantsCard,
  ActivityTeamsCard,
  ProposalHistoryCard,
} from './ActivityInfoSections';

const BackLink: React.FC = () => (
  <a href="#/activities" style={{ display: 'inline-block', marginBottom: 12, color: token('color.link', '#0052CC') }}>
    ← Danh sách hoạt động
  </a>
);

const NOT_FOUND_MESSAGE = 'Không tìm thấy hoạt động hoặc bạn không có quyền xem.';

/** Trang `#activity/:id`. Hoạt động của đơn vị khác server trả 404, trang hiện thông báo thay vì lỗi. */
export const ActivityDetailView: React.FC = () => {
  const { canWriteActivities } = useCapabilities();
  const { id } = useParams<{ id: string }>();
  const activityId = Number(id);
  const validId = Number.isInteger(activityId) && activityId > 0;
  const { data, isLoading, error } = useQuery({
    queryKey: activityDetailKey(activityId),
    queryFn: () => fetchActivityDetail(activityId),
    enabled: validId,
  });

  if (validId && isLoading) return <LottieLoading message="Đang tải hoạt động..." size={140} />;

  if (!validId || !data) {
    const notFound = !validId || (error as { response?: { status?: number } } | null)?.response?.status === 404;
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <BackLink />
        <div role="alert" style={{ padding: 16, color: token('color.text.danger', '#AE2E24') }}>
          {notFound ? NOT_FOUND_MESSAGE : apiErrorMessage(error, 'Không tải được hoạt động. Vui lòng thử lại.')}
        </div>
      </div>
    );
  }

  const { activity } = data;
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingTop: 4 }}>
      <BackLink />
      <ActivityHero activity={activity} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <ActivityActions detail={data} />
        <ActivityTaskActions
          activityId={activity.id}
          activityType={activity.type}
          activityStatus={activity.status}
          canManage={data.canManage}
          activityTeams={data.activityTeams.map((t) => ({ team_id: t.team_id, name: t.name, color: t.color }))}
        />
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '2 1 480px', minWidth: 0 }}>
          <ActivityGeneralInfo activity={activity} teams={data.activityTeams} />
          <ActivityPlanSection tasks={data.tasks} attachments={data.attachments} activityType={activity.type} canManage={data.canManage} />
          <ActivityUpdatesSection activityId={activity.id} updates={data.updates} taggablePeople={data.taggablePeople} canWrite={canWriteActivities} />
        </div>
        <aside style={{ flex: '1 1 280px', minWidth: 0 }}>
          <ActivityTeamsCard teams={data.activityTeams} />
          <ActivityParticipantsCard participants={data.participants} />
          <ActivityDetailsCard activity={activity} />
          <ProposalHistoryCard history={data.proposalHistory} />
        </aside>
      </div>
    </div>
  );
};
