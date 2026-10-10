import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Dialog, Field, Select } from '../../../ui';
import {
  addTeamMember, apiErrorMessage, fetchTeamMembers, removeTeamMember, setTeamMemberRole,
  type TeamMemberRow, type TeamRole,
} from '../../api';
import { useCapabilities } from '../../capabilities';
import { teamMembersKey } from '../../queryKeys';
import { useToast } from '../../../shared/components/Toast';
import { invalidatePeople } from '../people/invalidate';
import { PeopleConfirmDialog } from '../people/peopleKit';
import { useCurrentUser } from '../people/useCurrentUser';
import './teams.css';

const TEAM_ROLE_LABEL: Record<TeamRole, string> = { member: 'Thành viên', vice_leader: 'Tổ phó', leader: 'Tổ trưởng' };
const GLOBAL_ADMIN_ROLES = ['admin', 'vice_admin'];

const teamRoleOf = (m: TeamMemberRow): TeamRole => (m.is_lead ? 'leader' : m.is_vice_lead ? 'vice_leader' : 'member');

export interface TeamMembersModalProps {
  teamId: number;
  teamName: string;
  onClose: () => void;
}

/** Hộp quản lý thành viên của một Tổ. Cha chỉ mount khi người dùng được quản lý Tổ (server vẫn chặn 403). */
export const TeamMembersModal: React.FC<TeamMembersModalProps> = ({ teamId, teamName, onClose }) => {
  const caps = useCapabilities();
  const me = useCurrentUser();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data, isLoading, error } = useQuery({ queryKey: teamMembersKey(teamId), queryFn: () => fetchTeamMembers(teamId) });
  const [userId, setUserId] = useState('');
  const [addRole, setAddRole] = useState<TeamRole>('member');
  const [addError, setAddError] = useState('');
  const [removing, setRemoving] = useState<TeamMemberRow | null>(null);

  const done = (message: string) => { toast.success(message); void invalidatePeople(queryClient); };
  const fail = (fallback: string) => (err: unknown) => toast.error(apiErrorMessage(err, fallback));

  const add = useMutation({
    mutationFn: () => addTeamMember(teamId, { user_id: Number(userId), team_role: caps.isExec ? addRole : 'member' }),
    onSuccess: () => { setUserId(''); setAddRole('member'); done('Đã thêm thành viên vào Tổ.'); },
    onError: (err) => setAddError(apiErrorMessage(err, 'Không thêm được thành viên.')),
  });
  const changeRole = useMutation({
    mutationFn: (v: { userId: number; role: TeamRole }) => setTeamMemberRole(teamId, v.userId, v.role),
    onSuccess: () => done('Đã cập nhật vai trò.'),
    onError: fail('Không cập nhật được vai trò.'),
  });
  const remove = useMutation({
    mutationFn: (uid: number) => removeTeamMember(teamId, uid),
    onSuccess: () => { setRemoving(null); done('Đã xoá thành viên khỏi Tổ.'); },
    onError: (err) => { setRemoving(null); toast.error(apiErrorMessage(err, 'Không xoá được thành viên.')); },
  });

  // Tổ trưởng/Tổ phó chỉ thêm tài khoản `member` (server 403 nếu khác).
  const addable = (data?.available ?? []).filter((u) => caps.isExec || u.role === 'member');
  const canChangeRole = (m: TeamMemberRow) => caps.isExec && !GLOBAL_ADMIN_ROLES.includes(m.role ?? '');
  // Admin xoá được mọi người; Tổ trưởng chỉ xoá thành viên thường không giữ cờ trưởng/phó. Không ai tự xoá mình.
  const canRemove = (m: TeamMemberRow) =>
    m.id !== me?.id && (caps.isExec || (m.role === 'member' && !m.is_lead && !m.is_vice_lead));

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { setAddError('Vui lòng chọn tài khoản.'); return; }
    setAddError('');
    add.mutate();
  };

  const roleOptions = (Object.keys(TEAM_ROLE_LABEL) as TeamRole[]).map((r) => ({ value: r, label: TEAM_ROLE_LABEL[r] }));
  const accountOptions = [
    { value: '', label: '— Chọn tài khoản —' },
    ...addable.map((u) => ({ value: String(u.id), label: `${u.name} · ${u.email}` })),
  ];

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }} title={`Thành viên Tổ ${teamName}`}>
        {isLoading && <p className="ppl-muted" role="status">Đang tải...</p>}
        {error != null && <p role="alert" className="ppl-error">{apiErrorMessage(error, 'Không tải được thành viên Tổ.')}</p>}
        {data && (
          <ul className="team-mlist">
            {data.members.map((m) => (
              <li key={m.id} className="team-mrow">
                <Avatar name={m.name} size={24} />
                <div className="team-mrow-main">
                  <div className="team-mrow-name">{m.name}</div>
                  <div className="team-mrow-mail">{m.email}</div>
                </div>
                {canChangeRole(m) ? (
                  <Select
                    aria-label={`Vai trò của ${m.name}`}
                    value={teamRoleOf(m)}
                    options={roleOptions}
                    disabled={changeRole.isPending}
                    onChange={(role) => changeRole.mutate({ userId: m.id, role: role as TeamRole })}
                  />
                ) : (
                  <span className="team-mrole">{GLOBAL_ADMIN_ROLES.includes(m.role ?? '') ? 'Ban điều hành' : TEAM_ROLE_LABEL[teamRoleOf(m)]}</span>
                )}
                {canRemove(m) && (
                  <Button size="sm" aria-label={`Xoá ${m.name} khỏi Tổ`} onClick={() => setRemoving(m)}>Xoá</Button>
                )}
              </li>
            ))}
            {data.members.length === 0 && <li className="ppl-muted">Tổ chưa có thành viên.</li>}
          </ul>
        )}
        {data && (
          <div className="team-madd">
            <h3 className="team-h2">Thêm thành viên</h3>
            {addable.length === 0 ? (
              <p className="ppl-muted">Mọi tài khoản phù hợp đều đã thuộc Tổ này.</p>
            ) : (
              <form noValidate className="ppl-form" onSubmit={submitAdd}>
                <Field label="Tài khoản">
                  <Select value={userId} onChange={setUserId} options={accountOptions} />
                </Field>
                {caps.isExec && (
                  <Field label="Vai trò trong Tổ">
                    <Select value={addRole} onChange={(role) => setAddRole(role as TeamRole)} options={roleOptions} />
                  </Field>
                )}
                {addError && <p role="alert" className="ppl-error">{addError}</p>}
                <div><Button type="submit" variant="primary" disabled={add.isPending}>Thêm vào Tổ</Button></div>
              </form>
            )}
          </div>
        )}
      </Dialog>
      <PeopleConfirmDialog
        open={removing !== null}
        title="Xoá thành viên khỏi Tổ"
        danger
        confirmLabel="Xoá khỏi Tổ"
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id)}
        onCancel={() => setRemoving(null)}
      >
        <p>Xoá <strong>{removing?.name}</strong> khỏi Tổ {teamName}?</p>
      </PeopleConfirmDialog>
    </>
  );
};
