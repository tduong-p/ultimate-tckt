import React, { useEffect, useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { apiErrorMessage, createDirective, fetchDieuHanhUnits } from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { todayVnKey } from '../../../shared/utils/date';
import { DH_UNITS_KEY, DIRECTIVES_KEY } from '../dieuhanh/queryKeys';
import { useDhActor } from '../dieuhanh/useDhActor';
import { ErrorText, FIELD_STYLE, FormDialog, QueryStatus, SelectField } from '../dieuhanh/parts';

export const CreateDirectiveModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const actor = useDhActor();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const titleId = useId();
  const bodyId = useId();
  const deadlineId = useId();
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
    <FormDialog isOpen={isOpen} title="Giao việc mới" confirmLabel="Giao việc" isLoading={mutation.isPending} onSubmit={submit} onCancel={onClose}>
      <SelectField label="Đơn vị nhận" required value={toUnit} onChange={setToUnit} options={options} placeholder="Chọn đơn vị" disabled={unitsLoading || Boolean(unitsError)} />
      <QueryStatus isLoading={unitsLoading} error={unitsError} onRetry={() => void retryUnits()} />
      <div style={{ marginTop: 12 }}>
        <label htmlFor={titleId}>Tiêu đề *</label>
        <Textfield id={titleId} value={title} maxLength={200} onChange={(e) => setTitle((e.target as HTMLInputElement).value)} />
      </div>
      <div style={{ marginTop: 12 }}>
        <label htmlFor={bodyId}>Nội dung</label>
        <TextArea id={bodyId} value={body} minimumRows={3} onChange={(e) => setBody(e.target.value)} />
      </div>
      <div style={{ marginTop: 12 }}>
        <label htmlFor={deadlineId}>Hạn hoàn thành *</label>
        <input id={deadlineId} type="date" min={todayVnKey()} value={deadline} onChange={(e) => setDeadline(e.target.value)} style={FIELD_STYLE} />
      </div>
      <ErrorText message={error} />
    </FormDialog>
  );
};
