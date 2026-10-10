import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Badge } from '../../../ui';
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
import './accounts.css';

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
    <div className="acc">
      <div className="acc-header">
        <div>
          <h1 className="acc-title">Quản trị tài khoản</h1>
          <p className="acc-subtitle">
            Tạo, sửa và xoá tài khoản, nhập danh sách hàng loạt, cấu hình bộ trọng số.
          </p>
        </div>
        <div className="acc-actions">
          <Button onClick={() => setImporting(true)}>Nhập danh sách hàng loạt</Button>
          <Button variant="primary" onClick={() => setCreating(true)}>Thêm tài khoản</Button>
        </div>
      </div>

      <div className="acc-filters">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên, email, số điện thoại, Tổ"
          aria-label="Tìm tài khoản"
          className="acc-search"
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
      {error != null && <p role="alert" style={{ color: 'var(--ui-danger)' }}>{apiErrorMessage(error, 'Không tải được danh sách tài khoản.')}</p>}
      {data && (
        <>
          <p style={{ fontSize: 13, color: 'var(--ui-text-muted)' }}>{filtered.length} tài khoản</p>
          {filtered.length === 0 ? (
            <p>Không tìm thấy tài khoản phù hợp. Thử đổi từ khoá hoặc bộ lọc.</p>
          ) : (
            <div className="acc-table-wrap">
              <table className="acc-table">
                <thead>
                  <tr>
                    <th>Tài khoản</th>
                    <th>Tổ</th>
                    <th>Vai trò</th>
                    <th>Đăng nhập</th>
                    <th><span style={{ position: 'absolute', left: -9999 }}>Thao tác</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <strong>{m.name}</strong>
                        <div className="acc-subtle-text">{m.email}{m.phone ? ` · ${m.phone}` : ''}</div>
                      </td>
                      <td>{m.teams || 'Chưa có Tổ'}</td>
                      <td><Badge tone="neutral">{getRoleLabel(m.role)}</Badge></td>
                      <td>
                        <Badge tone={m.auth_provider === 'microsoft' ? 'info' : 'neutral'}>
                          {m.auth_provider === 'microsoft' ? 'SSO' : 'Cục bộ'}
                        </Badge>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <Button size="sm" aria-label={`Sửa ${m.name}`} onClick={() => setEditing(m)}>Sửa</Button>
                        {m.id !== me?.id && (
                          <Button size="sm" aria-label={`Xoá ${m.name}`} onClick={() => setDeleting(m)}>Xoá</Button>
                        )}
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
