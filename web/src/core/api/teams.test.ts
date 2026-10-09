// web/src/core/api/teams.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/utils/api';
import {
  fetchTeamOverview, fetchTeamMembers, createTeam, updateTeam, deleteTeam, addTeamMember, setTeamMemberRole, removeTeamMember,
} from './teams';

vi.mock('../../shared/utils/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

describe('api/teams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchTeamOverview: GET /teams/:id/overview', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { team: { id: 3 }, members: [], tasks: [], activities: [] } });
    await expect(fetchTeamOverview(3)).resolves.toEqual({ team: { id: 3 }, members: [], tasks: [], activities: [] });
    expect(apiClient.get).toHaveBeenCalledWith('/teams/3/overview');
  });

  it('fetchTeamMembers: GET /teams/:id/members', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { members: [], available: [] } });
    await fetchTeamMembers(3);
    expect(apiClient.get).toHaveBeenCalledWith('/teams/3/members');
  });

  it('createTeam: POST /teams với name, description, color', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 9 } });
    await expect(createTeam({ name: 'Tổ mới', description: 'mô tả', color: '#1e3a8a' })).resolves.toEqual({ id: 9 });
    expect(apiClient.post).toHaveBeenCalledWith('/teams', { name: 'Tổ mới', description: 'mô tả', color: '#1e3a8a' });
  });

  it('updateTeam: PATCH /teams/:id', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { ok: true } });
    await updateTeam(3, { color: '#ff0000' });
    expect(apiClient.patch).toHaveBeenCalledWith('/teams/3', { color: '#ff0000' });
  });

  it('deleteTeam: DELETE /teams/:id và trả cờ deactivated', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { ok: true, deleted: false, deactivated: true } });
    await expect(deleteTeam(3)).resolves.toEqual({ ok: true, deleted: false, deactivated: true });
    expect(apiClient.delete).toHaveBeenCalledWith('/teams/3');
  });

  it('addTeamMember / setTeamMemberRole / removeTeamMember', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ok: true } });
    await addTeamMember(3, { user_id: 7, team_role: 'member' });
    expect(apiClient.post).toHaveBeenCalledWith('/teams/3/members', { user_id: 7, team_role: 'member' });

    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { ok: true, role: 'leader' } });
    await expect(setTeamMemberRole(3, 7, 'leader')).resolves.toEqual({ ok: true, role: 'leader' });
    expect(apiClient.patch).toHaveBeenCalledWith('/teams/3/members/7', { team_role: 'leader' });

    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { ok: true, role: 'member' } });
    await removeTeamMember(3, 7);
    expect(apiClient.delete).toHaveBeenCalledWith('/teams/3/members/7');
  });
});
