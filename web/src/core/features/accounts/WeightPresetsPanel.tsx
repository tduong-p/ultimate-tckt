import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiErrorMessage, createWeightPreset, deleteWeightPreset, fetchWeightPresets, settingErrorMessage, settingLock, updateWeightPreset,
  type SettingLock, type WeightPreset, type WeightPresetPayload,
} from '../../api';
import { WEIGHT_PRESETS_KEY } from '../../queryKeys';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useToast } from '../../../shared/components/Toast';
import { WeightPresetModal } from './WeightPresetModal';

export const WeightPresetsPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data, isLoading, error } = useQuery({ queryKey: WEIGHT_PRESETS_KEY, queryFn: fetchWeightPresets });
  const [modal, setModal] = useState<{ preset: WeightPreset | null } | null>(null);
  const [deleting, setDeleting] = useState<WeightPreset | null>(null);
  const [busy, setBusy] = useState(false);
  const [lock, setLock] = useState<SettingLock | null>(null);

  const run = async (action: () => Promise<unknown>, okMessage: string) => {
    try {
      await action();
      setLock(null);
      toast.success(okMessage);
      void queryClient.invalidateQueries({ queryKey: WEIGHT_PRESETS_KEY });
    } catch (err) {
      const found = settingLock(err);
      if (found) setLock(found);
      throw err;
    }
  };

  const save = (payload: WeightPresetPayload) => {
    const editing = modal?.preset;
    return run(
      () => (editing ? updateWeightPreset(editing.id, payload) : createWeightPreset(payload)),
      editing ? 'Đã cập nhật preset.' : 'Đã thêm preset.'
    );
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await run(() => deleteWeightPreset(deleting.id), 'Đã xoá preset.');
    } catch (err) {
      toast.error(settingErrorMessage(err));
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  return (
    <section style={{ marginTop: 32, border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: 6, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Bộ trọng số</h2>
        {data && <Button appearance="primary" onClick={() => setModal({ preset: null })}>Thêm preset</Button>}
      </div>
      <p style={{ color: token('color.text.subtle', '#5E6C84') }}>Các mức trọng số định sẵn (số nguyên 0–10) để thành viên chọn khi tự ghi nhận công việc.</p>
      {lock && (
        <p role="alert" style={{ padding: 8, borderRadius: 3, background: token('color.background.danger', '#FFEDEB'), color: token('color.text.danger', '#AE2E24') }}>
          {lock.message}{lock.reason ? ` Lý do: ${lock.reason}.` : ''}{lock.lockedBy ? ` Người khoá: ${lock.lockedBy}.` : ''}
        </p>
      )}
      {isLoading && <p>Đang tải...</p>}
      {error != null && <p role="alert" style={{ color: token('color.text.danger', '#AE2E24') }}>{apiErrorMessage(error, 'Không tải được bộ trọng số.')}</p>}
      {data && data.length === 0 && <p>Chưa có preset nào.</p>}
      {data && data.map((p) => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: `1px solid ${token('color.border', '#DFE1E6')}` }}>
          <strong style={{ width: 64 }}>{Number(p.points)} điểm</strong>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div>{p.name} {!Number(p.is_active) && <Lozenge appearance="removed">Đã tắt</Lozenge>}</div>
            {p.description && <small style={{ color: token('color.text.subtle', '#5E6C84') }}>{p.description}</small>}
          </div>
          <span style={{ fontSize: 12 }}>Thứ tự {p.sort_order}</span>
          <Button appearance="subtle" aria-label={`Sửa ${p.name}`} onClick={() => setModal({ preset: p })}>Sửa</Button>
          <Button appearance="subtle" aria-label={`Xoá ${p.name}`} onClick={() => setDeleting(p)}>Xoá</Button>
        </div>
      ))}
      <WeightPresetModal isOpen={modal !== null} preset={modal?.preset ?? null} onClose={() => setModal(null)} onSubmit={save} />
      <ConfirmDialog isOpen={deleting !== null} title="Xoá preset trọng số" appearance="danger" confirmLabel="Xoá preset" isLoading={busy} onConfirm={() => void confirmDelete()} onCancel={() => setDeleting(null)}>
        <p>Xoá preset <strong>{deleting?.name}</strong>? Công việc đã dùng trọng số này không bị ảnh hưởng.</p>
      </ConfirmDialog>
    </section>
  );
};
