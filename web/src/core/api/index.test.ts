import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/utils/api';
import {
  fetchSession,
  fetchBootstrap,
  fetchActivities,
  createActivity,
  fetchTeams,
  fetchMembers,
  fetchMyTasksToday,
  fetchDocuments,
  fetchArchive,
  getReportExportUrl,
  downloadReportExport,
  loginUser,
  logoutUser,
  submitStudentClass,
  acknowledgeFacultyNotice,
  approveActivity,
  rejectActivity,
  requestChangesActivity,
  submitActivityProposal,
  createActivityTask,
  fetchTaskDetail,
  acknowledgeTask,
  updateTaskStatus,
  submitTaskReview,
  reviewTask,
  toggleTaskChecklist,
  addTaskChecklistItem,
  deleteTaskChecklistItem,
} from './index';

vi.mock('../../shared/utils/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Core API Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchSession', () => {
    it('calls GET /session and returns session data', async () => {
      const mockSession = { user: { id: 1, name: 'Admin', role: 'admin' } };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockSession });

      const result = await fetchSession();

      expect(apiClient.get).toHaveBeenCalledWith('/session');
      expect(result).toEqual(mockSession);
    });
  });

  describe('fetchBootstrap', () => {
    it('calls GET /bootstrap and returns bootstrap data', async () => {
      const mockBootstrap = {
        stats: { activeActivities: 2, openTasks: 5, overdueTasks: 1, completedMonth: 10 },
        upcoming: [],
        tasks: [],
        activity: [],
        teams: [],
        capabilities: { canCreateActivity: true, canCreateAccount: false },
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockBootstrap });

      const result = await fetchBootstrap();

      expect(apiClient.get).toHaveBeenCalledWith('/bootstrap');
      expect(result).toEqual(mockBootstrap);
    });
  });

  describe('fetchActivities', () => {
    it('calls GET /activities with query parameters', async () => {
      const mockActivities = [{ id: 10, title: 'Hoạt động Mùa Hè Xanh' }];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockActivities });

      const params = { q: 'Mùa Hè', status: 'active', type: 'event' };
      const result = await fetchActivities(params);

      expect(apiClient.get).toHaveBeenCalledWith('/activities', { params });
      expect(result).toEqual(mockActivities);
    });

    it('calls GET /activities without parameters', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

      const result = await fetchActivities();

      expect(apiClient.get).toHaveBeenCalledWith('/activities', { params: undefined });
      expect(result).toEqual([]);
    });
  });

  describe('createActivity', () => {
    it('calls POST /activities with payload and returns created id', async () => {
      const payload = {
        title: 'Đại hội Chi đoàn',
        description: 'Đại hội nhiệm kỳ mới',
        type: 'event' as const,
        deadline: '2026-11-01',
        team_id: 1,
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 42 } });

      const result = await createActivity(payload);

      expect(apiClient.post).toHaveBeenCalledWith('/activities', payload);
      expect(result).toEqual({ id: 42 });
    });
  });

  describe('fetchTeams', () => {
    it('calls GET /teams and returns team list', async () => {
      const mockTeams = [{ id: 1, name: 'Tổ Tổ chức', color: '#0052CC', member_count: 5 }];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockTeams });

      const result = await fetchTeams();

      expect(apiClient.get).toHaveBeenCalledWith('/teams');
      expect(result).toEqual(mockTeams);
    });
  });

  describe('fetchMembers', () => {
    it('calls GET /people and returns member list', async () => {
      const mockMembers = [{ id: 1, name: 'Nguyễn Văn A', email: 'a@hust.edu.vn', role: 'member' }];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockMembers });

      const result = await fetchMembers();

      expect(apiClient.get).toHaveBeenCalledWith('/people');
      expect(result).toEqual(mockMembers);
    });
  });

  describe('fetchMyTasksToday', () => {
    it('calls GET /my-tasks-today and returns categorized tasks', async () => {
      const mockTasks = { dueToday: [], overdue: [], pendingMyReview: [] };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockTasks });

      const result = await fetchMyTasksToday();

      expect(apiClient.get).toHaveBeenCalledWith('/my-tasks-today');
      expect(result).toEqual(mockTasks);
    });
  });

  describe('fetchDocuments', () => {
    it('calls GET /documents with params and returns documents data', async () => {
      const mockDocs = { documents: [], filterTeams: [], issueTeams: [], years: [2026] };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockDocs });

      const params = { q: 'Kế hoạch', year: 2026, team_id: 2 };
      const result = await fetchDocuments(params);

      expect(apiClient.get).toHaveBeenCalledWith('/documents', { params });
      expect(result).toEqual(mockDocs);
    });
  });

  describe('fetchArchive', () => {
    it('calls GET /archive with params and returns archived activities', async () => {
      const mockArchive = [{ id: 1, title: 'Hoạt động đã kết thúc', status: 'completed' }];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockArchive });

      const params = { q: '2025' };
      const result = await fetchArchive(params);

      expect(apiClient.get).toHaveBeenCalledWith('/archive', { params });
      expect(result).toEqual(mockArchive);
    });
  });

  describe('downloadReportExport', () => {
    it('tải tệp Excel dạng blob qua apiClient', async () => {
      const blob = new Blob(['xlsx']);
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: blob });

      const result = await downloadReportExport({ start: '2026-10-01', end: '2026-10-08', team_id: 'all', lang: 'vi' });

      expect(apiClient.get).toHaveBeenCalledWith('/reports/export', {
        params: { start: '2026-10-01', end: '2026-10-08', lang: 'vi' },
        responseType: 'blob',
      });
      expect(result).toBe(blob);
    });

    it('ném lỗi mang thông điệp từ máy chủ khi bị từ chối', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce({
        response: { data: new Blob([JSON.stringify({ error: 'Choose a valid report date range.' })]) },
      });

      await expect(
        downloadReportExport({ start: '2026-10-08', end: '2026-10-01', lang: 'vi' })
      ).rejects.toThrow('Khoảng thời gian báo cáo không hợp lệ.');
    });

    it('giữ mã HTTP trên lỗi để lớp phiên nhận ra 401', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce({
        response: { status: 401, data: new Blob([JSON.stringify({ error: 'Please sign in to continue.' })]) },
      });

      await expect(
        downloadReportExport({ start: '2026-10-01', end: '2026-10-08', lang: 'vi' })
      ).rejects.toMatchObject({ response: { status: 401 }, message: 'Vui lòng đăng nhập để tiếp tục.' });
    });
  });

  describe('getReportExportUrl', () => {
    it('constructs direct export URL with query params', () => {
      const url = getReportExportUrl({
        start: '2026-09-01',
        end: '2026-10-01',
        team_id: 3,
        lang: 'vi',
      });

      expect(url).toBe('/api/reports/export?start=2026-09-01&end=2026-10-01&team_id=3&lang=vi');
    });

    it('defaults lang to vi and omits team_id when "all"', () => {
      const url = getReportExportUrl({
        start: '2026-09-01',
        end: '2026-10-01',
        team_id: 'all',
      });

      expect(url).toBe('/api/reports/export?start=2026-09-01&end=2026-10-01&lang=vi');
    });

    it('omits team_id when not provided', () => {
      const url = getReportExportUrl({
        start: '2026-09-01',
        end: '2026-10-01',
      });

      expect(url).toBe('/api/reports/export?start=2026-09-01&end=2026-10-01&lang=vi');
    });
  });

  describe('loginUser', () => {
    it('calls POST /login with credentials and returns user payload', async () => {
      const mockResponse = { user: { id: 1, name: 'Admin', email: 'admin@hust.edu.vn', role: 'admin' } };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResponse });

      const result = await loginUser({ email: 'admin@hust.edu.vn', password: 'secretpassword' });

      expect(apiClient.post).toHaveBeenCalledWith('/login', {
        email: 'admin@hust.edu.vn',
        password: 'secretpassword',
      });
      expect(result).toEqual(mockResponse);
    });

    it('throws error when API fails', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Invalid credentials'));

      await expect(
        loginUser({ email: 'other@hust.edu.vn', password: 'wrong' })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('logoutUser', () => {
    it('calls POST /logout and returns ok status', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ok: true } });

      const result = await logoutUser();

      expect(apiClient.post).toHaveBeenCalledWith('/logout');
      expect(result).toEqual({ ok: true });
    });
  });

  describe('onboarding', () => {
    it('gửi số lớp của sinh viên và trả về user mới', async () => {
      const user = { id: 5, name: 'SV', email: 'a.b20230001@sis.hust.edu.vn', role: 'member', class_number: 'Điện 1' };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { user } });

      const result = await submitStudentClass('Điện 1');

      expect(apiClient.post).toHaveBeenCalledWith('/onboarding/student-class', { class_number: 'Điện 1' });
      expect(result).toEqual(user);
    });

    it('xác nhận thông báo cho giảng viên', async () => {
      const user = { id: 6, name: 'GV', email: 'gv@hust.edu.vn', role: 'member' };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { user } });

      const result = await acknowledgeFacultyNotice();

      expect(apiClient.post).toHaveBeenCalledWith('/onboarding/faculty-notice');
      expect(result).toEqual(user);
    });
  });

  describe('Activity Proposal Actions', () => {
    it('approveActivity calls POST /activities/:id/approve', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ok: true } });
      const result = await approveActivity(10);
      expect(apiClient.post).toHaveBeenCalledWith('/activities/10/approve');
      expect(result).toEqual({ ok: true });
    });

    it('rejectActivity calls POST /activities/:id/reject with feedback', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ok: true, deleted: true } });
      const result = await rejectActivity(10, 'Thiếu thông tin');
      expect(apiClient.post).toHaveBeenCalledWith('/activities/10/reject', { feedback: 'Thiếu thông tin' });
      expect(result).toEqual({ ok: true, deleted: true });
    });

    it('requestChangesActivity calls POST /activities/:id/request-changes with feedback', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ok: true } });
      const result = await requestChangesActivity(10, 'Cần bổ sung kinh phí');
      expect(apiClient.post).toHaveBeenCalledWith('/activities/10/request-changes', { feedback: 'Cần bổ sung kinh phí' });
      expect(result).toEqual({ ok: true });
    });

    it('submitActivityProposal calls POST /activities/:id/submit', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ok: true } });
      const result = await submitActivityProposal(10);
      expect(apiClient.post).toHaveBeenCalledWith('/activities/10/submit');
      expect(result).toEqual({ ok: true });
    });
  });

  describe('Task Management Actions', () => {
    it('createActivityTask calls POST /activities/:id/tasks with payload', async () => {
      const payload = {
        title: 'Chuẩn bị âm thanh',
        team_id: 1,
        primary_assignee_id: 2,
        deadline: '2026-10-15',
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 99 } });
      const result = await createActivityTask(10, payload);
      expect(apiClient.post).toHaveBeenCalledWith('/activities/10/tasks', payload);
      expect(result).toEqual({ id: 99 });
    });

    it('fetchTaskDetail calls GET /tasks/:id', async () => {
      const mockDetail = { task: { id: 99, title: 'Test' }, assignees: [] };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockDetail });
      const result = await fetchTaskDetail(99);
      expect(apiClient.get).toHaveBeenCalledWith('/tasks/99');
      expect(result).toEqual(mockDetail);
    });

    it('acknowledgeTask calls POST /tasks/:id/acknowledge', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ok: true } });
      const result = await acknowledgeTask(99);
      expect(apiClient.post).toHaveBeenCalledWith('/tasks/99/acknowledge');
      expect(result).toEqual({ ok: true });
    });

    it('updateTaskStatus calls PATCH /tasks/:id/status', async () => {
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { ok: true } });
      const result = await updateTaskStatus(99, 'in_progress');
      expect(apiClient.patch).toHaveBeenCalledWith('/tasks/99/status', { status: 'in_progress' });
      expect(result).toEqual({ ok: true });
    });

    it('submitTaskReview calls POST /tasks/:id/submit-review', async () => {
      const payload = { notes: 'Đã xong', link_url: 'https://example.com' };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ok: true } });
      const result = await submitTaskReview(99, payload);
      expect(apiClient.post).toHaveBeenCalledWith('/tasks/99/submit-review', payload);
      expect(result).toEqual({ ok: true });
    });

    it('reviewTask calls POST /tasks/:id/review', async () => {
      const payload = { decision: 'approve' as const, feedback: 'Tốt' };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ok: true } });
      const result = await reviewTask(99, payload);
      expect(apiClient.post).toHaveBeenCalledWith('/tasks/99/review', payload);
      expect(result).toEqual({ ok: true });
    });

    it('toggleTaskChecklist calls PATCH /tasks/:id/checklist/:itemId', async () => {
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { ok: true } });
      const result = await toggleTaskChecklist(99, 1, true);
      expect(apiClient.patch).toHaveBeenCalledWith('/tasks/99/checklist/1', { is_done: true });
      expect(result).toEqual({ ok: true });
    });

    it('addTaskChecklistItem calls POST /tasks/:id/checklist', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 101 } });
      const result = await addTaskChecklistItem(99, 'Việc nhỏ 1');
      expect(apiClient.post).toHaveBeenCalledWith('/tasks/99/checklist', { title: 'Việc nhỏ 1' });
      expect(result).toEqual({ id: 101 });
    });

    it('deleteTaskChecklistItem calls DELETE /tasks/:id/checklist/:itemId', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { ok: true } });
      const result = await deleteTaskChecklistItem(99, 1);
      expect(apiClient.delete).toHaveBeenCalledWith('/tasks/99/checklist/1');
      expect(result).toEqual({ ok: true });
    });
  });
});
