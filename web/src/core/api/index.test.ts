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
  loginUser,
  logoutUser,
} from './index';

vi.mock('../../shared/utils/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
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
});

