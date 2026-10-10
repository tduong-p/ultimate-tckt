import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, fetchTeams, updateUser, type MemberItem, type UpdateUserPayload } from '../../api';
import { useCapabilities } from '../../capabilities';
import { TEAMS_KEY } from '../../queryKeys';
import { useToast } from '../../../shared/components/Toast';
import { Field, Select } from '../../../ui';
import { PeopleFormDialog, TeamChecks } from '../people/peopleKit';
import { invalidatePeople } from '../people/invalidate';
import { ROLE_OPTIONS } from '../people/roleLabels';

const COLOR_RE = /^#[0-9a-f]{6}$/i;

export const EditAccountModal: React.FC<{ member: MemberItem | null; onClose: () => void }> = ({ member, onClose }) => (
  <>{member && <EditAccountDialog member={member} onClose={onClose} />}</>
);

const EditAccountDialog: React.FC<{ member: MemberItem; onClose: () => void }> = ({ member, onClose }) => {
  const caps = useCapabilities();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: teams = [] } = useQuery({ queryKey: TEAMS_KEY, queryFn: fetchTeams });
  const allowedTeams = caps.isExec ? teams : teams.filter((t) => caps.canManageTeam(t.id));
  const [name, setName] = useState(member.name);
  const [email, setEmail] = useState(member.email);
  const [phone, setPhone] = useState(member.phone ?? '');
  const [color, setColor] = useState(member.avatar_color && COLOR_RE.test(member.avatar_color) ? member.avatar_color : '#0052cc');
  const [role, setRole] = useState(member.role);
  const [password, setPassword] = useState('');
  const [teamIds, setTeamIds] = useState<number[]>(
    String(member.team_ids ?? '').split(',').map((s) => Number(s.trim())).filter((n) => n > 0)
  );
  const [error, setError] = useState('');
  const effectiveRole = caps.isExec ? role : 'member';

  const mutation = useMutation({
    mutationFn: () => {
      const payload: UpdateUserPayload = { name: name.trim(), phone: phone.trim(), avatar_color: color, role: effectiveRole, team_ids: teamIds };
      // Chỉ admin được đổi email và mật khẩu; Tổ trưởng gửi hai field này là bị 403.
      if (caps.isExec) {
        payload.email = email.trim();
        if (password) payload.password = password;
      }
      return updateUser(member.id, payload);
    },
    onSuccess: () => {
      toast.success('Đã cập nhật tài khoản.');
      void invalidatePeople(queryClient);
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không cập nhật được tài khoản.')),
  });

  const submit = () => {
    if (!name.trim() || (caps.isExec && !email.trim())) return setError('Cần có tên và email.');
    if (caps.isExec && password && password.length < 8) return setError('Mật khẩu phải có ít nhất 8 ký tự.');
    if (effectiveRole === 'member' && teamIds.length === 0) return setError('Thành viên phải thuộc ít nhất một Tổ.');
    setError('');
    mutation.mutate();
  };

  return (
    <PeopleFormDialog title="Sửa tài khoản" submitLabel="Lưu" submitting={mutation.isPending} error={error} onSubmit={submit} onClose={onClose}>
      <Field label="Họ và tên">
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      {caps.isExec && (
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      )}
      <Field label="Số điện thoại">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <Field label="Màu đại diện">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      </Field>
      {caps.isExec && (
        <>
          <Field label="Vai trò">
            <Select value={role} onChange={setRole} options={ROLE_OPTIONS} />
          </Field>
          <Field label="Mật khẩu mới">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <p className="ppl-hint">Để trống để giữ mật khẩu hiện tại.</p>
        </>
      )}
      <TeamChecks teams={allowedTeams} value={teamIds} onChange={setTeamIds} />
    </PeopleFormDialog>
  );
};
