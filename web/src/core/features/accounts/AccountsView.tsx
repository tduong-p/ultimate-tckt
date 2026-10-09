import React, { useMemo, useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import { useQuery } from '@tanstack/react-query';
import { apiErrorMessage, fetchMembers, type MemberItem } from '../../api';
import { MEMBERS_KEY } from '../../queryKeys';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import { normalizeSearch } from '../../../shared/utils/text';
import { CreateAccountModal } from '../members/CreateAccountModal';
import { DeleteAccountDialog } from '../members/DeleteAccountDialog';
import { EditAccountModal } from '../members/EditAccountModal';
import { selectStyle } from '../people/FormField';
import { getRoleLabel, ROLE_OPTIONS } from '../people/roleLabels';
import { useCurrentUser } from '../people/useCurrentUser';
import { BulkImportModal } from './BulkImportModal';
import { WeightPresetsPanel } from './WeightPresetsPanel';

const cell: React.CSSProperties = {
  padding: '8px 10px',
  textAlign: 'left',
  borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
  verticalAlign: 'top',
};

/** `#accounts`: chỉ admin (AppRoutes chặn). Bộ trọng số và nhập hàng loạt gắn thêm ở Task 7, 8. */
export const AccountsView: React.FC = () => {
  const me = useCurrentUser();
  const { data, isLoading, error } = useQuery({ queryKey: MEMBERS_KEY, queryFn: fetchMembers });
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [auth, setAuth] = useState('all');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<MemberItem | null>(null);
  const [deleting, setDeleting] = useState<MemberItem | null>(null);
  const [importing, setImporting] = useState(false);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    return (data ?? []).filter((m) => {
      const matchQuery = !q || normalizeSearch(`${m.name} ${m.email} ${m.phone ?? ''} ${m.teams ?? ''}`).includes(q);
      const matchRole = role === 'all' || m.role === role;
      const matchAuth = auth === 'all' || (m.auth_provider || 'local') === auth;
      return matchQuery && matchRole && matchAuth;
    });
  }, [data, query, role, auth]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingTop: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Quản trị tài khoản</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: token('color.text.subtle', '#5E6C84') }}>
            Tạo, sửa và xoá tài khoản, nhập danh sách hàng loạt, cấu hình bộ trọng số.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => setImporting(true)}>Nhập danh sách hàng loạt</Button>
          <Button appearance="primary" onClick={() => setCreating(true)}>Thêm tài khoản</Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên, email, số điện thoại, Tổ"
          aria-label="Tìm tài khoản"
          style={{ flex: '1 1 280px', height: 32, padding: '0 10px', borderRadius: 3, border: `1px solid ${token('color.border', '#DFE1E6')}`, background: token('elevation.surface', '#fff'), color: token('color.text', '#172B4D') }}
        />
        <select aria-label="Lọc theo vai trò" style={{ ...selectStyle, width: 180 }} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="all">Tất cả vai trò</option>
          {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select aria-label="Lọc theo kiểu đăng nhập" style={{ ...selectStyle, width: 180 }} value={auth} onChange={(e) => setAuth(e.target.value)}>
          <option value="all">Mọi kiểu đăng nhập</option>
          <option value="local">Cục bộ</option>
          <option value="microsoft">SSO</option>
        </select>
      </div>

      {isLoading && <LottieLoading message="Đang tải danh sách tài khoản..." size={140} />}
      {error != null && <p role="alert" style={{ color: token('color.text.danger', '#AE2E24') }}>{apiErrorMessage(error, 'Không tải được danh sách tài khoản.')}</p>}
      {data && (
        <>
          <p style={{ fontSize: 13 }}>{filtered.length} tài khoản</p>
          {filtered.length === 0 ? (
            <p>Không tìm thấy tài khoản phù hợp. Thử đổi từ khoá hoặc bộ lọc.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr><th style={cell}>Tài khoản</th><th style={cell}>Tổ</th><th style={cell}>Vai trò</th><th style={cell}>Đăng nhập</th><th style={cell}><span style={{ position: 'absolute', left: -9999 }}>Thao tác</span></th></tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr key={m.id}>
                      <td style={cell}>
                        <strong>{m.name}</strong>
                        <div style={{ fontSize: 12, color: token('color.text.subtle', '#5E6C84') }}>{m.email}{m.phone ? ` · ${m.phone}` : ''}</div>
                      </td>
                      <td style={cell}>{m.teams || 'Chưa có Tổ'}</td>
                      <td style={cell}><Lozenge>{getRoleLabel(m.role)}</Lozenge></td>
                      <td style={cell}><Lozenge appearance={m.auth_provider === 'microsoft' ? 'new' : 'default'}>{m.auth_provider === 'microsoft' ? 'SSO' : 'Cục bộ'}</Lozenge></td>
                      <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                        <Button appearance="subtle" aria-label={`Sửa ${m.name}`} onClick={() => setEditing(m)}>Sửa</Button>
                        {m.id !== me?.id && <Button appearance="subtle" aria-label={`Xoá ${m.name}`} onClick={() => setDeleting(m)}>Xoá</Button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <WeightPresetsPanel />
      <CreateAccountModal isOpen={creating} onClose={() => setCreating(false)} />
      <EditAccountModal member={editing} onClose={() => setEditing(null)} />
      <DeleteAccountDialog member={deleting} onClose={() => setDeleting(null)} />
      <BulkImportModal isOpen={importing} onClose={() => setImporting(false)} />
    </div>
  );
};
