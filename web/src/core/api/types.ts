export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'vice_admin' | 'leader' | 'vice_leader' | 'member' | string;
  phone?: string | null;
  avatar_color?: string;
  class_number?: string | null;
  faculty_notice_acknowledged_at?: string | null;
  is_active?: number | boolean;
  is_devops?: number | boolean;
  /** Các field dưới đây do `withHustIdentity` (core/src/auth/hust-identity.js) thêm vào. */
  hust_account_type?: string | null;
  entrance_year?: number | null;
  cohort?: string | null;
  onboarding?: { type: 'faculty_notice' | 'student_class'; required: boolean } | null;
}

export interface SessionUnit {
  id: number;
  code: string;
  name: string;
  kind: string;
}

/** Phần tử `units.memberships` do `sessionView` trả về (core/src/middleware/unit-context.js). */
export interface SessionMembership {
  unit_id: number;
  code: string;
  name: string;
  kind: string;
  role: string;
}

export interface SessionData {
  user: SessionUser | null;
  units?: {
    current: SessionUnit | null;
    memberships: SessionMembership[];
  };
  capabilities?: Record<string, boolean>;
}

export type ActivityStatus =
  | 'proposed'
  | 'changes_requested'
  | 'approved'
  | 'active'
  | 'completed'
  | 'cancelled';

export interface ActivityItem {
  id: number;
  title: string;
  description?: string;
  is_public?: boolean | number;
  public_image_url?: string | null;
  proposal_document_url?: string | null;
  /** Thiếu ở dòng tóm tắt (`toSummaryView`) của hoạt động thuộc đơn vị khác. */
  type?: 'event' | 'assigned' | string;
  team_id?: number;
  creator_id?: number;
  start_date?: string | null;
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'urgent' | string;
  requested_by?: string | null;
  location?: string | null;
  event_lead_id?: number | null;
  status: ActivityStatus | string;
  created_at?: string;
  updated_at?: string;
  unit_id?: number;
  team_name?: string;
  team_color?: string;
  creator_name?: string;
  event_lead_name?: string | null;
  team_names?: string;
  task_count?: number;
  done_count?: number;
  participant_count?: number;
  result_summary?: string | null;
  last_update?: string | null;
  /** Chỉ có ở dòng tóm tắt (`toSummaryView`) của hoạt động thuộc đơn vị khác. */
  progress_percent?: number;
  directive_id?: number | null;
}

export interface TeamItem {
  id: number;
  name: string;
  description?: string | null;
  color?: string;
  sort_order?: number;
  is_active?: number | boolean;
  member_count?: number;
  active_count?: number;
  can_manage?: boolean | number;
}

export interface MemberItem {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'vice_admin' | 'leader' | 'vice_leader' | 'member' | string;
  phone?: string | null;
  avatar_color?: string;
  auth_provider?: string;
  is_active?: number | boolean;
  teams?: string;
  team_ids?: string;
  completed_tasks?: number;
  can_manage?: boolean;
}

export interface TaskItem {
  id: number;
  activity_id: number;
  team_id: number;
  title: string;
  description?: string | null;
  deadline: string;
  start_date?: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent' | string;
  status: 'open' | 'in_progress' | 'review' | 'done' | 'cancelled' | string;
  created_at?: string;
  updated_at?: string;
  activity_title?: string;
  team_name?: string;
  assignee_name?: string;
  assignee_ids?: string;
  submitted_for_review_at?: string | null;
  completed_at?: string | null;
  weight?: number | string;
  is_self_logged?: number | boolean | null;
  deliverable?: string | null;
  primary_assignee_id?: number | null;
  primary_assignee_name?: string | null;
  checklist_total?: number;
  checklist_done?: number;
  stage?: string;
}

export interface DocumentItem {
  id: number;
  name: string;
  link_url: string;
  description?: string;
  applicable_year: number;
  issuing_team_id: number;
  visibility: 'all_teams' | 'issuing_team' | string;
  created_by?: number;
  team_name?: string;
  team_color?: string;
  creator_name?: string;
  can_edit?: boolean;
  created_at?: string;
}

export interface ActivityLogItem {
  body: string;
  kind: string;
  created_at: string;
  user_name: string;
  avatar_color: string;
  activity_title: string;
  activity_id: number;
}

export interface BootstrapStats {
  activeActivities: number;
  openTasks: number;
  overdueTasks: number;
  completedMonth: number;
}

export interface BootstrapCapabilities {
  canCreateActivity: boolean;
  canCreateAccount: boolean;
}

export interface BootstrapData {
  stats: BootstrapStats;
  upcoming: ActivityItem[];
  tasks: TaskItem[];
  activity: ActivityLogItem[];
  teams: TeamItem[];
  capabilities: BootstrapCapabilities;
}

export interface CreateActivityPayload {
  title: string;
  description: string;
  type: 'event' | 'assigned' | string;
  deadline: string;
  team_id?: number;
  team_ids?: number[];
  start_date?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'urgent' | string;
  requested_by?: string | null;
  location?: string | null;
  event_lead_id?: number | null;
  proposal_document_url?: string | null;
  public_image_url?: string | null;
  is_public?: boolean | string;
}

export interface ActivityFilterParams {
  q?: string;
  status?: string;
  type?: string;
}

export interface MyTasksTodayResponse {
  dueToday: TaskItem[];
  overdue: TaskItem[];
  pendingMyReview: TaskItem[];
}

export interface DocumentTeamOption {
  id: number;
  name: string;
  color?: string;
}

export interface DocumentsResponse {
  documents: DocumentItem[];
  filterTeams: DocumentTeamOption[];
  issueTeams: DocumentTeamOption[];
  years: number[];
}

export interface DocumentFilterParams {
  q?: string;
  year?: string | number;
  team_id?: string | number;
}

export interface ArchiveFilterParams {
  q?: string;
}

export interface ReportExportParams {
  start: string;
  end: string;
  team_id?: number | string;
  lang?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}


export interface TaskDetailTask extends TaskItem {
  activity_status?: string;
  activity_description?: string | null;
  activity_deadline?: string;
  assigned_by?: number | null;
}

export interface TaskAssignee {
  user_id: number;
  is_primary: number | boolean;
  acknowledged_at: string | null;
  name: string;
  email?: string;
  avatar_color?: string;
}

export type TaskAssigneeInfo = TaskAssignee;

export interface TaskAttachment {
  id: number;
  task_id: number;
  kind: string;
  label: string;
  link_url: string | null;
  original_name: string | null;
  mime_type: string | null;
  size_bytes: number | string | null;
  created_at: string;
  user_name: string;
}

export interface TaskUpdate {
  id: number;
  kind: string;
  body: string;
  created_at: string;
  user_name: string;
  avatar_color?: string;
}

export interface ChecklistItem {
  id: number;
  task_id: number;
  title: string;
  is_done: number | boolean;
  sort_order?: number;
  done_by?: number | null;
  done_at?: string | null;
}

export type TaskChecklistItem = ChecklistItem;

export interface TaskDetailResponse {
  task: TaskDetailTask;
  assignees: TaskAssignee[];
  attachments?: TaskAttachment[];
  updates?: TaskUpdate[];
  checklist?: ChecklistItem[];
  canUpdate?: boolean;
  myAcknowledgedAt?: string | null;
}

export type ReviewDecision = 'approve' | 'reject' | 'cancel';
export type TaskTransitionStatus = 'todo' | 'in_progress';
export type TaskAttachmentKind = 'clarification' | 'evidence' | 'issue' | 'deliverable';
export type TaskCommentKind = 'comment' | 'progress' | 'issue' | 'evidence';

export interface CreateTaskPayload {
  title: string;
  description?: string | null;
  stage?: string;
  priority?: string;
  team_id: number;
  start_date?: string | null;
  deadline: string;
  deliverable?: string | null;
  primary_assignee_id: number;
  co_assignee_ids?: number[];
}

export interface EditTaskPayload {
  deadline?: string;
  start_date?: string | null;
  priority?: string;
  deliverable?: string | null;
}

export interface LogTaskPayload {
  title: string;
  team_id: number;
  weight?: number;
  link_url?: string;
  description?: string;
}

export interface SubmitTaskReviewPayload {
  notes?: string;
  link_url?: string;
}

export interface ReviewTaskPayload {
  decision: ReviewDecision;
  feedback?: string;
}

export interface WeightPreset {
  id: number;
  name: string;
  points: number;
  description?: string | null;
}

export interface TeamMemberOption {
  id: number;
  name: string;
  email?: string;
  role?: string;
  is_lead?: number | boolean;
  is_vice_lead?: number | boolean;
}

export interface TeamMembersResponse {
  members: TeamMemberOption[];
  available: TeamMemberOption[];
}

export interface BoardTeam {
  team_id: number;
  name: string;
  color?: string;
  role?: string;
}

export interface ActivityBoardData {
  activity: ActivityItem;
  activityTeams: BoardTeam[];
  tasks: TaskItem[];
  canManage: boolean;
}

export interface DocumentPayload {
  name: string;
  link_url: string;
  description: string;
  applicable_year: number;
  issuing_team_id: number;
  visibility: 'issuing_team' | 'all_teams';
}

export interface NotificationItem {
  id: number;
  kind: string;
  title: string;
  body: string;
  /** Hash cũ của Core, vd. `/#activity/12`. */
  url?: string | null;
  email_status?: string | null;
  push_status?: string | null;
  seen_at?: string | null;
  created_at: string;
  expires_at?: string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unread_count: number;
}
