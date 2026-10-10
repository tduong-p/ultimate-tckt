import React, { useId, useState } from 'react';
import { settingErrorMessage, type WeightPreset, type WeightPresetPayload } from '../../api';
import { FormDialog } from '../people/FormDialog';
import { FormField } from '../people/FormField';

export interface WeightPresetModalProps {
  isOpen: boolean;
  preset: WeightPreset | null;
  onClose: () => void;
  onSubmit: (payload: WeightPresetPayload) => Promise<void>;
}

export const WeightPresetModal: React.FC<WeightPresetModalProps> = ({ isOpen, preset, onClose, onSubmit }) => (
  isOpen ? <WeightPresetDialog preset={preset} onClose={onClose} onSubmit={onSubmit} /> : null
);

const WeightPresetDialog: React.FC<Omit<WeightPresetModalProps, 'isOpen'>> = ({ preset, onClose, onSubmit }) => {
  const ids = { name: useId(), points: useId(), order: useId(), description: useId(), active: useId() };
  const [name, setName] = useState(preset?.name ?? '');
  const [points, setPoints] = useState(preset ? String(preset.points) : '1');
  const [order, setOrder] = useState(preset ? String(preset.sort_order ?? 0) : '0');
  const [description, setDescription] = useState(preset?.description ?? '');
  const [active, setActive] = useState(preset ? Boolean(Number(preset.is_active)) : true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setError('Tên preset không được để trống.');
    if (trimmed.length > 100) return setError('Tên preset tối đa 100 ký tự.');
    if (!/^\d+$/.test(points.trim()) || Number(points) > 10) return setError('Điểm trọng số phải là số nguyên từ 0 đến 10.');
    if (!/^-?\d+$/.test(order.trim())) return setError('Thứ tự phải là số nguyên.');
    setError('');
    setBusy(true);
    try {
      await onSubmit({
        name: trimmed,
        points: Number(points),
        sort_order: Number(order),
        description: description.trim(),
        ...(preset ? { is_active: active } : {}),
      });
      onClose();
    } catch (err) {
      setError(settingErrorMessage(err));
    } finally {
      setBusy(false);
    }
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
    <FormDialog title={preset ? 'Sửa preset' : 'Thêm preset'} submitLabel="Lưu" isSubmitting={busy} error={error} onSubmit={() => void submit()} onClose={onClose}>
      <FormField label="Tên preset" htmlFor={ids.name}>
        <input id={ids.name} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      </FormField>
      <FormField label="Điểm (0–10)" htmlFor={ids.points}>
        <input id={ids.points} inputMode="numeric" value={points} onChange={(e) => setPoints(e.target.value)} style={inputStyle} />
      </FormField>
      <FormField label="Thứ tự" htmlFor={ids.order}>
        <input id={ids.order} inputMode="numeric" value={order} onChange={(e) => setOrder(e.target.value)} style={inputStyle} />
      </FormField>
      <FormField label="Mô tả" htmlFor={ids.description}>
        <textarea id={ids.description} value={description} rows={2} maxLength={255} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
      </FormField>
      {preset && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
          <input id={ids.active} type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          <label htmlFor={ids.active} style={{ fontSize: '13px', cursor: 'pointer' }}>Đang dùng</label>
        </div>
      )}
    </FormDialog>
  );
};
