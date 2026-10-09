export type StageKey = 'before' | 'during' | 'after' | 'general';

export const STAGE_LABELS: Record<StageKey, string> = {
  before: 'Trước',
  during: 'Trong',
  after: 'Sau',
  general: 'Chung',
};

export interface StageGroup<T> {
  key: StageKey;
  label: string;
  tasks: T[];
}

const EVENT_STAGES: StageKey[] = ['before', 'during', 'after'];

function eventStage(stage?: string | null): StageKey {
  return stage === 'during' || stage === 'after' ? stage : 'before';
}

/** Hoạt động sự kiện: Trước/Trong/Sau (giai đoạn lạ hoặc `general` → Trước). Việc được giao: chỉ "Chung". Ẩn việc đã huỷ. */
export function groupTasksByStage<T extends { stage?: string | null; status: string }>(
  tasks: T[],
  activityType?: string | null
): StageGroup<T>[] {
  const visible = tasks.filter((t) => t.status !== 'cancelled');
  if (activityType === 'assigned') return [{ key: 'general', label: STAGE_LABELS.general, tasks: visible }];
  return EVENT_STAGES.map((key) => ({
    key,
    label: STAGE_LABELS[key],
    tasks: visible.filter((t) => eventStage(t.stage) === key),
  }));
}
