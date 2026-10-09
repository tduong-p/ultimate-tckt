import React, { useEffect, useId, useMemo, useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { token } from '@atlaskit/tokens';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiErrorMessage,
  createDocument,
  updateDocument,
  type DocumentItem,
  type DocumentPayload,
  type DocumentTeamOption,
} from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { LinkField, LINK_ERROR_MESSAGE } from '../../../shared/components/LinkField';
import { isHttpUrl } from '../../../shared/utils/url';
import { todayVnKey } from '../../../shared/utils/date';

export interface DocumentFormModalProps {
  isOpen: boolean;
  /** `null` = thêm mới. */
  document: DocumentItem | null;
  issueTeams: DocumentTeamOption[];
  onClose: () => void;
}

interface FormState {
  name: string;
  link_url: string;
  year: string;
  team: string;
  visibility: 'issuing_team' | 'all_teams';
  description: string;
}

function initialState(document: DocumentItem | null, issueTeams: DocumentTeamOption[]): FormState {
  if (document) {
    return {
      name: document.name,
      link_url: document.link_url,
      year: String(document.applicable_year),
      team: String(document.issuing_team_id),
      visibility: document.visibility === 'all_teams' ? 'all_teams' : 'issuing_team',
      description: document.description ?? '',
    };
  }
  return {
    name: '',
    link_url: '',
    year: todayVnKey().slice(0, 4),
    team: issueTeams.length === 1 ? String(issueTeams[0].id) : '',
    visibility: 'issuing_team',
    description: '',
  };
}

/** Luật của `POST/PATCH /api/documents` (core/src/routes/documents.js); server vẫn kiểm lại. */
function validate(form: FormState): string | null {
  const name = form.name.trim();
  if (!name) return 'Vui lòng nhập tên văn bản.';
  if (name.length > 200) return 'Tên văn bản không quá 200 ký tự.';
  if (!isHttpUrl(form.link_url)) return LINK_ERROR_MESSAGE;
  const year = Number(form.year);
  if (!form.year.trim() || !Number.isInteger(year) || year < 1900 || year > 2100) return 'Năm áp dụng phải từ 1900 đến 2100.';
  if (!form.team) return 'Vui lòng chọn Tổ ban hành.';
  const description = form.description.trim();
  if (!description) return 'Vui lòng nhập mô tả văn bản.';
  if (description.length > 4000) return 'Mô tả không quá 4000 ký tự.';
  return null;
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  height: 40,
  padding: '0 8px',
  borderRadius: 3,
  border: `1px solid ${token('color.border', '#DFE1E6')}`,
  background: token('elevation.surface', '#fff'),
  color: token('color.text', '#172B4D'),
};

const FieldRow: React.FC<{ htmlFor: string; label: string; children: React.ReactNode }> = ({ htmlFor, label, children }) => (
  <div style={{ marginBottom: 12 }}>
    <label htmlFor={htmlFor} style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>{label}</label>
    {children}
  </div>
);

export const DocumentFormModal: React.FC<DocumentFormModalProps> = ({ isOpen, document, issueTeams, onClose }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const ids = { name: useId(), year: useId(), team: useId(), visibility: useId(), description: useId() };
  const [form, setForm] = useState<FormState>(() => initialState(document, issueTeams));
  const [error, setError] = useState('');

  // Chỉ nạp lại form khi mở hộp hoặc đổi văn bản; tải lại danh sách giữa chừng không được xoá chữ đang gõ.
  useEffect(() => {
    if (isOpen) {
      setForm(initialState(document, issueTeams));
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, document?.id]);

  const teamOptions = useMemo(() => {
    if (document && !issueTeams.some((t) => t.id === document.issuing_team_id)) {
      return [...issueTeams, { id: document.issuing_team_id, name: document.team_name ?? `Tổ #${document.issuing_team_id}` }];
    }
    return issueTeams;
  }, [document, issueTeams]);

  const mutation = useMutation({
    mutationFn: async (payload: DocumentPayload) => {
      if (document) {
        await updateDocument(document.id, payload);
      } else {
        await createDocument(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['core-documents'] });
      toast.success(document ? 'Đã cập nhật văn bản.' : 'Đã thêm văn bản.');
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không lưu được văn bản.')),
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = () => {
    const invalid = validate(form);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError('');
    mutation.mutate({
      name: form.name.trim(),
      link_url: form.link_url.trim(),
      description: form.description.trim(),
      applicable_year: Number(form.year),
      issuing_team_id: Number(form.team),
      visibility: form.visibility,
    });
  };

  const noTeam = teamOptions.length === 0;

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="medium">
          <ModalHeader><ModalTitle>{document ? 'Sửa văn bản' : 'Thêm văn bản'}</ModalTitle></ModalHeader>
          <ModalBody>
            <form noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <FieldRow htmlFor={ids.name} label="Tên văn bản *">
                <Textfield id={ids.name} value={form.name} maxLength={200} onChange={(e) => set('name', (e.target as HTMLInputElement).value)} />
              </FieldRow>
              <LinkField label="Liên kết văn bản" isRequired value={form.link_url} onChange={(v) => set('link_url', v)} />
              <div style={{ height: 12 }} />
              <FieldRow htmlFor={ids.year} label="Năm áp dụng *">
                <Textfield id={ids.year} type="number" min={1900} max={2100} value={form.year} onChange={(e) => set('year', (e.target as HTMLInputElement).value)} />
              </FieldRow>
              <FieldRow htmlFor={ids.team} label="Tổ ban hành *">
                <select id={ids.team} value={form.team} style={selectStyle} onChange={(e) => set('team', e.target.value)}>
                  <option value="">Chọn Tổ</option>
                  {teamOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </FieldRow>
              {noTeam && (
                <p style={{ color: token('color.text.warning', '#946F00'), marginTop: -4 }}>
                  Bạn chưa thuộc Tổ nào nên chưa thể ban hành văn bản.
                </p>
              )}
              <FieldRow htmlFor={ids.visibility} label="Phạm vi xem *">
                <select id={ids.visibility} value={form.visibility} style={selectStyle} onChange={(e) => set('visibility', e.target.value as FormState['visibility'])}>
                  <option value="issuing_team">Thành viên Tổ ban hành</option>
                  <option value="all_teams">Tất cả các Tổ</option>
                </select>
              </FieldRow>
              <FieldRow htmlFor={ids.description} label="Mô tả *">
                <TextArea id={ids.description} value={form.description} maxLength={4000} minimumRows={3} onChange={(e) => set('description', e.target.value)} />
              </FieldRow>
              {error && <p role="alert" style={{ color: token('color.text.danger', '#AE2E24') }}>{error}</p>}
            </form>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>Huỷ</Button>
            <Button appearance="primary" isLoading={mutation.isPending} isDisabled={noTeam} onClick={submit}>Lưu văn bản</Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
};
