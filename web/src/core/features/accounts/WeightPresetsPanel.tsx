import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Badge } from '../../../ui';
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
    <section className="acc-preset-panel">
      <div className="acc-preset-header">
        <h2 style={{ margin: 0, fontSize: 18, color: 'var(--ui-text)' }}>Bộ trọng số</h2>
        {data && <Button variant="primary" onClick={() => setModal({ preset: null })}>Thêm preset</Button>}
      </div>
      <p style={{ color: 'var(--ui-text-muted)' }}>Các mức trọng số định sẵn (số nguyên 0–10) để thành viên chọn khi tự ghi nhận công việc.</p>
      {lock && (
        <p role="alert" style={{ padding: 8, borderRadius: 'var(--ui-radius-sm)', background: 'var(--ui-danger-soft, #FFEDEB)', color: 'var(--ui-danger)' }}>
          {lock.message}{lock.reason ? ` Lý do: ${lock.reason}.` : ''}{lock.lockedBy ? ` Người khoá: ${lock.lockedBy}.` : ''}
        </p>
      )}
      {isLoading && <p>Đang tải...</p>}
      {error != null && <p role="alert" style={{ color: 'var(--ui-danger)' }}>{apiErrorMessage(error, 'Không tải được bộ trọng số.')}</p>}
      {data && data.length === 0 && <p>Chưa có preset nào.</p>}
      {data && data.map((p) => (
        <div key={p.id} className="acc-preset-row">
          <strong style={{ width: 64 }}>{Number(p.points)} điểm</strong>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div>{p.name} {!Number(p.is_active) && <Badge tone="danger">Đã tắt</Badge>}</div>
            {p.description && <small style={{ color: 'var(--ui-text-muted)' }}>{p.description}</small>}
          </div>
          <span style={{ fontSize: 12, color: 'var(--ui-text-muted)' }}>Thứ tự {p.sort_order}</span>
          <Button size="sm" aria-label={`Sửa ${p.name}`} onClick={() => setModal({ preset: p })}>Sửa</Button>
          <Button size="sm" aria-label={`Xoá ${p.name}`} onClick={() => setDeleting(p)}>Xoá</Button>
        </div>
      ))}
      <WeightPresetModal isOpen={modal !== null} preset={modal?.preset ?? null} onClose={() => setModal(null)} onSubmit={save} />
      <ConfirmDialog isOpen={deleting !== null} title="Xoá preset trọng số" appearance="danger" confirmLabel="Xoá preset" isLoading={busy} onConfirm={() => void confirmDelete()} onCancel={() => setDeleting(null)}>
        <p>Xoá preset <strong>{deleting?.name}</strong>? Công việc đã dùng trọng số này không bị ảnh hưởng.</p>
      </ConfirmDialog>
    </section>
  );
};
