import React, { useState, useMemo } from 'react';
import { token } from '@atlaskit/tokens';
import Lozenge from '@atlaskit/lozenge';
import Select from '@atlaskit/select';
import Button, { LinkButton } from '@atlaskit/button/new';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import InboxIcon from '@atlaskit/icon/core/inbox';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import { fetchDocuments, type DocumentItem } from '../../api';
import { DocumentFormModal } from './DocumentFormModal';
import { formatVnDate } from '../../../shared/utils/date';

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

  const yearOptions = useMemo(() => {
    const list = data?.years || [];
    return [
      { label: 'Tất cả các năm', value: 'all' },
      ...list.map((y) => ({ label: String(y), value: String(y) })),
    ];
  }, [data?.years]);

  const teamOptions = useMemo(() => {
    const list = data?.filterTeams || [];
    return [
      { label: 'Tất cả các Tổ', value: 'all' },
      ...list.map((t) => ({ label: t.name, value: String(t.id) })),
    ];
  }, [data?.filterTeams]);

  const documents: DocumentItem[] = data?.documents || [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '4px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 600,
              color: token('color.text', '#172B4D'),
              letterSpacing: '-0.2px',
            }}
          >
            Văn bản
          </h1>
          <p
            style={{
              margin: '6px 0 0 0',
              fontSize: '14px',
              color: token('color.text.subtle', '#5E6C84'),
            }}
          >
            Danh mục liên kết văn bản do các Tổ TCKT ban hành.
          </p>
        </div>
        <Button appearance="primary" isDisabled={!data} onClick={() => setFormState({ open: true, doc: null })}>
          Thêm văn bản
        </Button>
      </div>


      {/* Toolbar: Search and Filters */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 260px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm văn bản..."
            style={{
              width: '100%',
              height: '38px',
              padding: '0 12px',
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: '4px',
              fontSize: '14px',
              color: token('color.text', '#172B4D'),
              backgroundColor: token('elevation.surface', '#FFFFFF'),
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div className="mobile-w-full" style={{ width: '180px' }}>
          <Select
            defaultValue={{ label: 'Tất cả các năm', value: 'all' }}
            options={yearOptions}
            onChange={(opt: any) => setYearFilter(opt?.value || 'all')}
          />
        </div>

        <div className="mobile-w-full" style={{ width: '220px' }}>
          <Select
            defaultValue={{ label: 'Tất cả các Tổ', value: 'all' }}
            options={teamOptions}
            onChange={(opt: any) => setTeamFilter(opt?.value || 'all')}
          />
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <LottieLoading message="Đang tải danh sách văn bản..." size={140} />
      ) : error ? (
        <div
          style={{
            padding: '16px',
            backgroundColor: token('color.background.danger', '#FFEBE6'),
            color: token('color.text.danger', '#BF2600'),
            borderRadius: '4px',
          }}
        >
          Không thể tải danh sách văn bản. Vui lòng thử lại sau.
        </div>
      ) : documents.length === 0 ? (
        /* Empty State Box */
        <div
          data-testid="documents-empty-state"
          style={{
            maxWidth: '560px',
            backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: '4px',
            padding: '20px 24px',
            boxShadow: token(
              'elevation.shadow.raised',
              '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'
            ),
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              color: token('color.icon', '#42526E'),
              marginTop: '2px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <InboxIcon label="" />
          </div>
          <div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: token('color.text', '#172B4D'),
                marginBottom: '6px',
              }}
            >
              Không tìm thấy văn bản
            </div>
            <div
              style={{
                fontSize: '13px',
                color: token('color.text.subtle', '#5E6C84'),
              }}
            >
              Hãy thêm văn bản đầu tiên hoặc thay đổi bộ lọc.
            </div>
          </div>
        </div>
      ) : (
        /* Documents List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {documents.map((doc) => (
            <div
              key={doc.id}
              data-testid={`document-item-${doc.id}`}
              style={{
                backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
                border: `1px solid ${token('color.border', '#DFE1E6')}`,
                borderRadius: '6px',
                padding: '16px 20px',
                boxShadow: token(
                  'elevation.shadow.raised',
                  '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'
                ),
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap',
                    marginBottom: '6px',
                  }}
                >
                  <a
                    href={doc.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: token('color.link', '#0052CC'),
                      textDecoration: 'none',
                    }}
                  >
                    {doc.name}
                  </a>
                  {doc.team_name && (
                    <Lozenge appearance="inprogress">{doc.team_name}</Lozenge>
                  )}
                  <Lozenge appearance="default">Năm {doc.applicable_year}</Lozenge>
                  {doc.visibility === 'all_teams' ? (
                    <Lozenge appearance="success">Tất cả các Tổ</Lozenge>
                  ) : (
                    <Lozenge appearance="moved">Nội bộ Tổ</Lozenge>
                  )}
                </div>
                {doc.description && (
                  <p
                    style={{
                      margin: '4px 0 0 0',
                      fontSize: '13px',
                      color: token('color.text.subtle', '#5E6C84'),
                      lineHeight: 1.4,
                    }}
                  >
                    {doc.description}
                  </p>
                )}
                <div style={{ marginTop: '8px', fontSize: '12px', color: token('color.text.subtle', '#5E6C84') }}>
                  Bởi {doc.creator_name ?? 'không rõ'}
                  {doc.created_at ? ` · ${formatVnDate(doc.created_at)}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {doc.can_edit && (
                  <Button appearance="default" onClick={() => setFormState({ open: true, doc })}>Sửa</Button>
                )}
                <LinkButton
                  appearance="subtle"
                  href={doc.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mở liên kết ↗
                </LinkButton>
              </div>
            </div>
          ))}
        </div>
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
