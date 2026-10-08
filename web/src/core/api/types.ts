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
}

export interface SessionUnit {
  id: number;
  code: string;
  name: string;
  kind: string;
}

export interface SessionData {
  user: SessionUser | null;
  units?: {
    current: SessionUnit | null;
    available: SessionUnit[];
  };
  capabilities?: Record<string, boolean>;
}

export interface ActivityItem {
  id: number;
  title: string;
  description?: string;
  is_public?: boolean | number;
  public_image_url?: string | null;
  proposal_document_url?: string | null;
  type: 'event' | 'assigned' | string;
  team_id: number;
  creator_id?: number;
  start_date?: string | null;
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'urgent' | string;
  requested_by?: string | null;
  location?: string | null;
  event_lead_id?: number | null;
  status: 'proposed' | 'approved' | 'active' | 'completed' | 'cancelled' | string;
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

