import React, { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, updateMyAccount, type SessionData } from '../../api';
import { MEMBERS_KEY, SESSION_KEY } from '../../queryKeys';
import { useToast } from '../../../shared/components/Toast';
import { FormDialog } from '../people/FormDialog';
import { FormField } from '../people/FormField';
import { useCurrentUser } from '../people/useCurrentUser';

const EMAIL_RE = /^[^\s@]+@[^\s@]+$/;
const COLOR_RE = /^#[0-9a-f]{6}$/i;

export const MyAccountModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => (
  isOpen ? <MyAccountDialog onClose={onClose} /> : null
);

const MyAccountDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const ids = { email: useId(), phone: useId(), color: useId(), password: useId() };
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [color, setColor] = useState(user?.avatar_color && COLOR_RE.test(user.avatar_color) ? user.avatar_color : '#0052cc');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => updateMyAccount({ email: email.trim(), phone: phone.trim(), avatar_color: color, ...(password ? { password } : {}) }),
    onSuccess: (updated) => {
      queryClient.setQueryData<SessionData>(SESSION_KEY, (prev) => (prev?.user ? { ...prev, user: { ...prev.user, ...updated } } : prev));
      void queryClient.invalidateQueries({ queryKey: MEMBERS_KEY });
      toast.success('Đã cập nhật tài khoản.');
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không cập nhật được tài khoản.')),
  });

  const submit = () => {
    if (!EMAIL_RE.test(email.trim())) return setError('Vui lòng nhập email hợp lệ.');
    if (password && password.length < 8) return setError('Mật khẩu phải có ít nhất 8 ký tự.');
    setError('');
    mutation.mutate();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 'var(--ui-radius-sm, 4px)',
    border: '1px solid var(--ui-border)',
    background: 'var(--ui-bg-input, var(--ui-bg-card))',
    color: 'var(--ui-text)',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
  };

  return (
    <FormDialog title="Tài khoản của tôi" submitLabel="Lưu tài khoản" isSubmitting={mutation.isPending} error={error} onSubmit={submit} onClose={onClose}>
      <p style={{ marginTop: 0 }}><strong>{user?.name}</strong> — chỉ quản lý mới đổi được tên và vai trò của tài khoản.</p>
      <FormField label="Email" htmlFor={ids.email}>
        <input id={ids.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
      </FormField>
      <FormField label="Số điện thoại" htmlFor={ids.phone}>
        <input id={ids.phone} value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
      </FormField>
      <FormField label="Màu đại diện" htmlFor={ids.color}>
        <input id={ids.color} type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      </FormField>
      <FormField label="Mật khẩu mới" htmlFor={ids.password} hint="Để trống để giữ mật khẩu hiện tại. Tối thiểu 8 ký tự.">
        <input id={ids.password} type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
      </FormField>
    </FormDialog>
  );
};
