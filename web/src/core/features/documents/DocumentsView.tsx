import React, { useState, useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Badge, Button, Select } from '../../../ui';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import { fetchDocuments, type DocumentItem } from '../../api';
import { DocumentFormModal } from './DocumentFormModal';
import { formatVnDate } from '../../../shared/utils/date';
import '../people/people.css';
import './documents.css';

export const DocumentsView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery.trim());
  const [yearFilter, setYearFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [formState, setFormState] = useState<{ open: boolean; doc: DocumentItem | null }>({ open: false, doc: null });

  const { data, isLoading, error } = useQuery({
    queryKey: ['core-documents', { q: debouncedQuery, year: yearFilter, team_id: teamFilter }],
    queryFn: () =>
      fetchDocuments({
        q: debouncedQuery || undefined,
        year: yearFilter !== 'all' ? yearFilter : undefined,
        team_id: teamFilter !== 'all' ? teamFilter : undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const yearOptions = useMemo(
    () => [{ label: 'Tất cả các năm', value: 'all' }, ...(data?.years || []).map((y) => ({ label: String(y), value: String(y) }))],
    [data?.years],
  );
  const teamOptions = useMemo(
    () => [{ label: 'Tất cả các Tổ', value: 'all' }, ...(data?.filterTeams || []).map((t) => ({ label: t.name, value: String(t.id) }))],
    [data?.filterTeams],
  );

  const documents: DocumentItem[] = data?.documents || [];

  return (
    <div className="doc">
      <div className="ppl-head">
        <div>
          <h1 className="ppl-h1">Văn bản</h1>
          <p className="ppl-sub">Danh mục liên kết văn bản do các Tổ TCKT ban hành.</p>
        </div>
        <Button variant="primary" disabled={!data} onClick={() => setFormState({ open: true, doc: null })}>
          Thêm văn bản
        </Button>
      </div>

      <div className="doc-filters">
        <input
          type="text"
          className="ppl-input doc-search"
          aria-label="Tìm văn bản"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm văn bản..."
        />
        <Select aria-label="Lọc theo năm" value={yearFilter} onChange={setYearFilter} options={yearOptions} />
        <Select aria-label="Lọc theo Tổ" value={teamFilter} onChange={setTeamFilter} options={teamOptions} />
      </div>

      {isLoading ? (
        <p role="status" className="ppl-state">Đang tải danh sách văn bản...</p>
      ) : error ? (
        <p role="alert" className="ppl-state ppl-state--error">Không thể tải danh sách văn bản. Vui lòng thử lại sau.</p>
      ) : documents.length === 0 ? (
        <div data-testid="documents-empty-state" className="ppl-empty">
          <div className="ppl-empty-title">Không tìm thấy văn bản</div>
          <p className="ppl-empty-text">Hãy thêm văn bản đầu tiên hoặc thay đổi bộ lọc.</p>
        </div>
      ) : (
        <ul className="doc-list">
          {documents.map((doc) => (
            <li key={doc.id} data-testid={`document-item-${doc.id}`} className="doc-item">
              <div className="doc-main">
                <div className="doc-title-row">
                  <a className="doc-title" href={doc.link_url} target="_blank" rel="noopener noreferrer">{doc.name}</a>
                  {doc.team_name && <Badge tone="info">{doc.team_name}</Badge>}
                  <Badge>{`Năm ${doc.applicable_year}`}</Badge>
                  {doc.visibility === 'all_teams'
                    ? <Badge tone="success">Tất cả các Tổ</Badge>
                    : <Badge tone="warning">Nội bộ Tổ</Badge>}
                </div>
                {doc.description && <p className="doc-desc">{doc.description}</p>}
                <div className="doc-meta">
                  Bởi {doc.creator_name ?? 'không rõ'}
                  {doc.created_at ? ` · ${formatVnDate(doc.created_at)}` : ''}
                </div>
              </div>
              <div className="doc-actions">
                {doc.can_edit && <Button size="sm" onClick={() => setFormState({ open: true, doc })}>Sửa</Button>}
                <a className="ui-btn ui-btn-ghost ui-btn-sm" href={doc.link_url} target="_blank" rel="noopener noreferrer">
                  Mở liên kết ↗
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
      <DocumentFormModal
        isOpen={formState.open}
        document={formState.doc}
        issueTeams={data?.issueTeams ?? []}
        onClose={() => setFormState((s) => ({ ...s, open: false }))}
      />
    </div>
  );
};
