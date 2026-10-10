import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Field } from '../../../ui';
import { apiErrorMessage, createDirective, fetchDieuHanhUnits } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { todayVnKey } from '../../../shared/utils/date';
import { DH_UNITS_KEY, DIRECTIVES_KEY } from '../dieuhanh/queryKeys';
import { useDhActor } from '../dieuhanh/useDhActor';
import { DirFormDialog, ErrorLine, QueryStatus, SelectField } from './dirKit';

export const CreateDirectiveModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const actor = useDhActor();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [toUnit, setToUnit] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) { setToUnit(''); setTitle(''); setBody(''); setDeadline(''); setError(''); }
  }, [isOpen]);

  const { data: units = [], isLoading: unitsLoading, error: unitsError, refetch: retryUnits } = useQuery({ queryKey: DH_UNITS_KEY, queryFn: fetchDieuHanhUnits, enabled: isOpen });
  const options = units.filter((u) => u.id !== actor.unitId).map((u) => ({ value: String(u.id), label: u.name }));

  const mutation = useMutation({
    mutationFn: createDirective,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: DIRECTIVES_KEY });
      toast.success('Đã giao việc.');
      onClose();
      navigate(`/directive/${created.id}`);
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không giao được việc.')),
  });

  const submit = () => {
    if (!toUnit || !title.trim() || !deadline) {
      setError('Chọn đơn vị nhận, nhập tiêu đề và hạn hoàn thành.');
      return;
    }
    setError('');
    mutation.mutate({ to_unit_id: Number(toUnit), title: title.trim(), body: body.trim() || undefined, deadline });
  };

  return (
    <DirFormDialog isOpen={isOpen} title="Giao việc mới" confirmLabel="Giao việc" isLoading={mutation.isPending} onSubmit={submit} onCancel={onClose}>
      <SelectField label="Đơn vị nhận" required value={toUnit} onChange={setToUnit} options={options} placeholder="Chọn đơn vị" disabled={unitsLoading || Boolean(unitsError)} />
      <QueryStatus isLoading={unitsLoading} error={unitsError} onRetry={() => void retryUnits()} />
      <Field label="Tiêu đề *">
        <input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Nội dung">
        <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <Field label="Hạn hoàn thành *">
        <input type="date" min={todayVnKey()} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </Field>
      <ErrorLine message={error} />
    </DirFormDialog>
  );
};
