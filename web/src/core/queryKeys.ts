export const SESSION_KEY = ['session'] as const;
export const BOOTSTRAP_KEY = ['core-bootstrap'] as const;
export const TASK_KEY = (taskId: number) => ['core-task', taskId] as const;
export const MY_TASKS_TODAY_KEY = ['core-my-tasks-today'] as const;
export const ACTIVITY_PREFIX = ['core-activity'] as const;
export const activityBoardKey = (activityId: number) => [...ACTIVITY_PREFIX, activityId] as const;

export const TEAMS_KEY = ['core-teams'] as const;
export const MEMBERS_KEY = ['core-members'] as const;
export const TEAM_KEY_PREFIX = ['core-team'] as const;
export const teamOverviewKey = (teamId: number) => ['core-team', teamId, 'overview'] as const;
export const teamMembersKey = (teamId: number) => ['core-team', teamId, 'members'] as const;
export const WEIGHT_PRESETS_KEY = ['core-weight-presets'] as const;
