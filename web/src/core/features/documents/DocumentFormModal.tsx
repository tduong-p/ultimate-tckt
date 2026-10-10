import React, { useMemo, useState } from 'react';
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
import { LINK_ERROR_MESSAGE } from '../../../shared/components/LinkField';
import { Field, Select } from '../../../ui';
import { PeopleFormDialog } from '../people/peopleKit';
import './documents.css';
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

export const DocumentFormModal: React.FC<DocumentFormModalProps> = ({ isOpen, document, issueTeams, onClose }) => {
  if (!isOpen) return null;
  // Mỗi lần mở (hoặc đổi văn bản) là một lần mount mới: form nạp lại, tải lại danh sách giữa chừng không xoá chữ đang gõ.
  return <DocumentForm key={document?.id ?? 'new'} document={document} issueTeams={issueTeams} onClose={onClose} />;
};

const DocumentForm: React.FC<Omit<DocumentFormModalProps, 'isOpen'>> = ({ document, issueTeams, onClose }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(() => initialState(document, issueTeams));
  const [error, setError] = useState('');

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
  const linkInvalid = form.link_url.trim() !== '' && !isHttpUrl(form.link_url);

  return (
    <PeopleFormDialog
      title={document ? 'Sửa văn bản' : 'Thêm văn bản'}
      submitLabel="Lưu văn bản"
      submitting={mutation.isPending || noTeam}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <Field label="Tên văn bản *">
        <input value={form.name} maxLength={200} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field label="Liên kết văn bản *" error={linkInvalid ? LINK_ERROR_MESSAGE : undefined}>
        <input type="url" value={form.link_url} placeholder="https://" onChange={(e) => set('link_url', e.target.value)} />
      </Field>
      <Field label="Năm áp dụng *">
        <input type="number" min={1900} max={2100} value={form.year} onChange={(e) => set('year', e.target.value)} />
      </Field>
      <Field label="Tổ ban hành *">
        <Select
          value={form.team}
          onChange={(v) => set('team', v)}
          options={[{ value: '', label: 'Chọn Tổ' }, ...teamOptions.map((t) => ({ value: String(t.id), label: t.name }))]}
        />
      </Field>
      {noTeam && <p className="doc-warn">Bạn chưa thuộc Tổ nào nên chưa thể ban hành văn bản.</p>}
      <Field label="Phạm vi xem *">
        <Select
          value={form.visibility}
          onChange={(v) => set('visibility', v as FormState['visibility'])}
          options={[
            { value: 'issuing_team', label: 'Thành viên Tổ ban hành' },
            { value: 'all_teams', label: 'Tất cả các Tổ' },
          ]}
        />
      </Field>
      <Field label="Mô tả *">
        <textarea rows={3} value={form.description} maxLength={4000} onChange={(e) => set('description', e.target.value)} />
      </Field>
    </PeopleFormDialog>
  );
};
