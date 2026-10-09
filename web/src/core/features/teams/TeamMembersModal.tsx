import React, { useId, useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addTeamMember, apiErrorMessage, fetchTeamMembers, removeTeamMember, setTeamMemberRole,
  type TeamMemberRow, type TeamRole,
} from '../../api';
import { useCapabilities } from '../../capabilities';
import { teamMembersKey } from '../../queryKeys';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useToast } from '../../../shared/components/Toast';
import { FormError, FormField, selectStyle } from '../people/FormField';
import { invalidatePeople } from '../people/invalidate';
import { useCurrentUser } from '../people/useCurrentUser';

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
  const accountId = useId();
  const roleId = useId();
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

  return (
    <>
      <ModalTransition>
        <Modal onClose={onClose} width="medium">
          <ModalHeader><ModalTitle>Thành viên Tổ {teamName}</ModalTitle></ModalHeader>
          <ModalBody>
            {isLoading && <p>Đang tải...</p>}
            {error != null && <FormError message={apiErrorMessage(error, 'Không tải được thành viên Tổ.')} />}
            {data && (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {data.members.map((m) => (
                  <li key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: token('color.text.subtle', '#5E6C84') }}>{m.email}</div>
                    </div>
                    {canChangeRole(m) ? (
                      <select
                        aria-label={`Vai trò của ${m.name}`}
                        style={{ ...selectStyle, width: 130 }}
                        value={teamRoleOf(m)}
                        disabled={changeRole.isPending}
                        onChange={(e) => changeRole.mutate({ userId: m.id, role: e.target.value as TeamRole })}
                      >
                        {(Object.keys(TEAM_ROLE_LABEL) as TeamRole[]).map((r) => <option key={r} value={r}>{TEAM_ROLE_LABEL[r]}</option>)}
                      </select>
                    ) : (
                      <span style={{ fontSize: 12 }}>{GLOBAL_ADMIN_ROLES.includes(m.role ?? '') ? 'Ban điều hành' : TEAM_ROLE_LABEL[teamRoleOf(m)]}</span>
                    )}
                    {canRemove(m) && (
                      <Button appearance="subtle" aria-label={`Xoá ${m.name} khỏi Tổ`} onClick={() => setRemoving(m)}>Xoá</Button>
                    )}
                  </li>
                ))}
                {data.members.length === 0 && <li>Tổ chưa có thành viên.</li>}
              </ul>
            )}
            {data && (
              <form noValidate onSubmit={submitAdd} style={{ marginTop: 16 }}>
                <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>Thêm thành viên</h3>
                {addable.length === 0 ? (
                  <p style={{ color: token('color.text.subtle', '#5E6C84') }}>Mọi tài khoản phù hợp đều đã thuộc Tổ này.</p>
                ) : (
                  <>
                    <FormField label="Tài khoản" htmlFor={accountId}>
                      <select id={accountId} style={selectStyle} value={userId} onChange={(e) => setUserId(e.target.value)}>
                        <option value="">— Chọn tài khoản —</option>
                        {addable.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.email}</option>)}
                      </select>
                    </FormField>
                    {caps.isExec && (
                      <FormField label="Vai trò trong Tổ" htmlFor={roleId}>
                        <select id={roleId} style={selectStyle} value={addRole} onChange={(e) => setAddRole(e.target.value as TeamRole)}>
                          {(Object.keys(TEAM_ROLE_LABEL) as TeamRole[]).map((r) => <option key={r} value={r}>{TEAM_ROLE_LABEL[r]}</option>)}
                        </select>
                      </FormField>
                    )}
                    <FormError message={addError} />
                    <Button type="submit" appearance="primary" isLoading={add.isPending}>Thêm vào Tổ</Button>
                  </>
                )}
              </form>
            )}
          </ModalBody>
          <ModalFooter><Button appearance="subtle" onClick={onClose}>Đóng</Button></ModalFooter>
        </Modal>
      </ModalTransition>
      <ConfirmDialog
        isOpen={removing !== null}
        title="Xoá thành viên khỏi Tổ"
        appearance="danger"
        confirmLabel="Xoá khỏi Tổ"
        isLoading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id)}
        onCancel={() => setRemoving(null)}
      >
        <p>Xoá <strong>{removing?.name}</strong> khỏi Tổ {teamName}?</p>
      </ConfirmDialog>
    </>
  );
};
