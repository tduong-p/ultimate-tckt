import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, createUser, fetchTeams } from '../../api';
import { useCapabilities } from '../../capabilities';
import { TEAMS_KEY } from '../../queryKeys';
import { useToast } from '../../../shared/components/Toast';
import { Field, Select } from '../../../ui';
import { PeopleFormDialog, TeamChecks } from '../people/peopleKit';
import { invalidatePeople } from '../people/invalidate';
import { ROLE_OPTIONS } from '../people/roleLabels';

export const CreateAccountModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => (
  <>{isOpen && <CreateAccountDialog onClose={onClose} />}</>
);

const CreateAccountDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const caps = useCapabilities();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: teams = [] } = useQuery({ queryKey: TEAMS_KEY, queryFn: fetchTeams });
  // Admin chọn mọi Tổ và mọi vai trò; Tổ trưởng chỉ Tổ mình quản lý và luôn tạo `member`.
  const allowedTeams = caps.isExec ? teams : teams.filter((t) => caps.canManageTeam(t.id));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [kind, setKind] = useState<'local' | 'microsoft'>('local');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('member');
  const [phone, setPhone] = useState('');
  const [teamIds, setTeamIds] = useState<number[]>([]);
  const [error, setError] = useState('');
  const effectiveRole = caps.isExec ? role : 'member';

  const mutation = useMutation({
    mutationFn: () =>
      createUser({
        name: name.trim(),
        email: email.trim(),
        role: effectiveRole,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        auth_provider: kind,
        ...(kind === 'local' ? { password } : {}),
        team_ids: teamIds,
      }),
    onSuccess: () => {
      toast.success('Đã tạo tài khoản.');
      void invalidatePeople(queryClient);
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không tạo được tài khoản.')),
  });

  const submit = () => {
    // Các câu dưới trùng câu server trả để người dùng gặp cùng một thông điệp dù chặn ở đâu.
    if (!name.trim() || !email.trim()) return setError('Tên và email là bắt buộc.');
    if (kind === 'local' && !password) return setError('Mật khẩu là bắt buộc đối với tài khoản đăng nhập cục bộ.');
    if (kind === 'local' && password.length < 8) return setError('Mật khẩu phải có ít nhất 8 ký tự.');
    if (effectiveRole === 'member' && teamIds.length === 0) return setError('Thành viên phải thuộc ít nhất một Tổ.');
    setError('');
    mutation.mutate();
  };

  return (
    <PeopleFormDialog title="Tạo tài khoản" submitLabel="Tạo" submitting={mutation.isPending} error={error} onSubmit={submit} onClose={onClose}>
      <Field label="Họ và tên">
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Email">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <fieldset className="ppl-fieldset">
        <legend className="ppl-legend">Kiểu đăng nhập</legend>
        <div className="ppl-inline">
          <label className="ppl-check"><input type="radio" name="auth-kind" checked={kind === 'local'} onChange={() => setKind('local')} /> Cục bộ (mật khẩu)</label>
          <label className="ppl-check"><input type="radio" name="auth-kind" checked={kind === 'microsoft'} onChange={() => setKind('microsoft')} /> SSO Microsoft</label>
        </div>
      </fieldset>
      {kind === 'local' && (
        <>
          <Field label="Mật khẩu">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <p className="ppl-hint">Tối thiểu 8 ký tự.</p>
        </>
      )}
      {caps.isExec && (
        <Field label="Vai trò">
          <Select value={role} onChange={setRole} options={ROLE_OPTIONS} />
        </Field>
      )}
      <Field label="Số điện thoại">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <TeamChecks teams={allowedTeams} value={teamIds} onChange={setTeamIds} />
    </PeopleFormDialog>
  );
};
