import React, { useId, useState } from 'react';
import { ModalTransition } from '@atlaskit/modal-dialog';
import Textfield from '@atlaskit/textfield';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, createUser, fetchTeams } from '../../api';
import { useCapabilities } from '../../capabilities';
import { TEAMS_KEY } from '../../queryKeys';
import { useToast } from '../../../shared/components/Toast';
import { FormDialog } from '../people/FormDialog';
import { FormField, selectStyle } from '../people/FormField';
import { invalidatePeople } from '../people/invalidate';
import { ROLE_OPTIONS } from '../people/roleLabels';
import { TeamCheckboxes } from '../people/TeamCheckboxes';

export const CreateAccountModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => (
  <ModalTransition>{isOpen && <CreateAccountDialog onClose={onClose} />}</ModalTransition>
);

const CreateAccountDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const ids = { name: useId(), email: useId(), password: useId(), role: useId(), phone: useId() };
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
    <FormDialog title="Tạo tài khoản" submitLabel="Tạo" isSubmitting={mutation.isPending} error={error} onSubmit={submit} onClose={onClose}>
      <FormField label="Họ và tên" htmlFor={ids.name}>
        <Textfield id={ids.name} value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} />
      </FormField>
      <FormField label="Email" htmlFor={ids.email}>
        <Textfield id={ids.email} type="email" value={email} onChange={(e) => setEmail((e.target as HTMLInputElement).value)} />
      </FormField>
      <fieldset style={{ border: 'none', padding: 0, margin: '0 0 12px' }}>
        <legend style={{ fontSize: 12, fontWeight: 600 }}>Kiểu đăng nhập</legend>
        <label><input type="radio" name="auth-kind" checked={kind === 'local'} onChange={() => setKind('local')} /> Cục bộ (mật khẩu)</label>{' '}
        <label><input type="radio" name="auth-kind" checked={kind === 'microsoft'} onChange={() => setKind('microsoft')} /> SSO Microsoft</label>
      </fieldset>
      {kind === 'local' && (
        <FormField label="Mật khẩu" htmlFor={ids.password} hint="Tối thiểu 8 ký tự.">
          <Textfield id={ids.password} type="password" value={password} onChange={(e) => setPassword((e.target as HTMLInputElement).value)} />
        </FormField>
      )}
      {caps.isExec && (
        <FormField label="Vai trò" htmlFor={ids.role}>
          <select id={ids.role} style={selectStyle} value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>
      )}
      <FormField label="Số điện thoại" htmlFor={ids.phone}>
        <Textfield id={ids.phone} value={phone} onChange={(e) => setPhone((e.target as HTMLInputElement).value)} />
      </FormField>
      <TeamCheckboxes teams={allowedTeams} value={teamIds} onChange={setTeamIds} />
    </FormDialog>
  );
};
