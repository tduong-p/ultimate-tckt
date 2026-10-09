export const SESSION_KEY = ['session'] as const;
export const BOOTSTRAP_KEY = ['core-bootstrap'] as const;
export const TASK_KEY = (taskId: number) => ['core-task', taskId] as const;
export const MY_TASKS_TODAY_KEY = ['core-my-tasks-today'] as const;
export const ACTIVITY_PREFIX = ['core-activity'] as const;
export const activityBoardKey = (activityId: number) => [...ACTIVITY_PREFIX, activityId] as const;
