import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Field } from '../../../ui';
import {
  apiErrorMessage, createSubmission, fetchActivities, fetchDieuHanhUnits, fetchDirectives, type SubmissionSource,
} from '../../api';
import { useToast } from '../../../shared/components/Toast';
import { DH_UNITS_KEY, DIRECTIVES_KEY, SUBMISSIONS_KEY } from '../dieuhanh/queryKeys';
import { useDhActor } from '../dieuhanh/useDhActor';
import { SOURCE_LABEL } from '../dieuhanh/labels';
import { ErrorText, FormDialog, QueryStatus, SelectField } from '../dieuhanh/parts';

/** Nguồn đã biết sẵn (vd. một nhật ký trực ban); không có thì chọn một hoạt động. */
export interface SubmissionPreset { sourceType: SubmissionSource; sourceId: number; label: string }

const OPEN_DIRECTIVE = ['acknowledged', 'in_progress', 'revision_requested'];
const SUBMITTABLE_ACTIVITY = ['approved', 'active', 'completed'];

export const CreateSubmissionModal: React.FC<{ isOpen: boolean; onClose: () => void; preset?: SubmissionPreset }> = ({ isOpen, onClose, preset }) => {
  const actor = useDhActor();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [toUnit, setToUnit] = useState('');
  const [activityId, setActivityId] = useState('');
  const [directiveId, setDirectiveId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) { setToUnit(''); setActivityId(''); setDirectiveId(''); setNote(''); setError(''); }
  }, [isOpen]);

  const { data: units = [], isLoading: unitsLoading, error: unitsError, refetch: retryUnits } = useQuery({ queryKey: DH_UNITS_KEY, queryFn: fetchDieuHanhUnits, enabled: isOpen });
  const { data: activities = [], isLoading: activitiesLoading, error: activitiesError, refetch: retryActivities } = useQuery({ queryKey: ['dieu-hanh-activities'], queryFn: () => fetchActivities(), enabled: isOpen && !preset });
  const { data: directives = [], isLoading: directivesLoading, error: directivesError, refetch: retryDirectives } = useQuery({ queryKey: DIRECTIVES_KEY, queryFn: fetchDirectives, enabled: isOpen });

  const unitOptions = units.filter((u) => u.id !== actor.unitId).map((u) => ({ value: String(u.id), label: u.name }));
  const activityOptions = activities
    .filter((a) => a.unit_id === actor.unitId && SUBMITTABLE_ACTIVITY.includes(a.status))
    .map((a) => ({ value: String(a.id), label: a.title }));
  const directiveOptions = directives
    .filter((d) => d.to_unit_id === actor.unitId && String(d.from_unit_id) === toUnit && OPEN_DIRECTIVE.includes(d.status))
    .map((d) => ({ value: String(d.id), label: d.title }));

  const mutation = useMutation({
    mutationFn: createSubmission,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: SUBMISSIONS_KEY });
      queryClient.invalidateQueries({ queryKey: DIRECTIVES_KEY });
      toast.success('Đã trình.');
      onClose();
      navigate(`/submission/${created.id}`);
    },
    onError: (err) => setError(apiErrorMessage(err, 'Không trình được.')),
  });

  const submit = () => {
    const sourceId = preset ? preset.sourceId : Number(activityId);
    if (!toUnit || !sourceId) {
      setError(preset ? 'Chọn đơn vị nhận.' : 'Chọn đơn vị nhận và hoạt động cần trình.');
      return;
    }
    setError('');
    mutation.mutate({
      to_unit_id: Number(toUnit),
      source_type: preset?.sourceType ?? 'activity',
      source_id: sourceId,
      ...(directiveId ? { directive_id: Number(directiveId) } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
  };

  return (
    <FormDialog isOpen={isOpen} title="Trình lên đơn vị khác" confirmLabel="Trình" isLoading={mutation.isPending} onSubmit={submit} onCancel={onClose}>
      <SelectField label="Đơn vị nhận" required value={toUnit} onChange={(v) => { setToUnit(v); setDirectiveId(''); }} disabled={unitsLoading || Boolean(unitsError)}
        options={unitOptions} placeholder="Chọn đơn vị" />
      <QueryStatus isLoading={unitsLoading} error={unitsError} onRetry={() => void retryUnits()} />
      {preset ? (
        <p style={{ marginTop: 12 }}>{SOURCE_LABEL[preset.sourceType]}: {preset.label}</p>
      ) : (
        <SelectField label="Hoạt động" required value={activityId} onChange={setActivityId} options={activityOptions} placeholder="Chọn hoạt động" disabled={activitiesLoading || Boolean(activitiesError)} />
      )}
      {!preset && <QueryStatus isLoading={activitiesLoading} error={activitiesError} onRetry={() => void retryActivities()} />}
      <SelectField label="Gắn với chỉ đạo (không bắt buộc)" value={directiveId} onChange={setDirectiveId} disabled={!toUnit || directivesLoading || Boolean(directivesError)}
        options={directiveOptions} placeholder="Không gắn" />
      <QueryStatus isLoading={directivesLoading} error={directivesError} onRetry={() => void retryDirectives()} />
      <Field label="Ghi chú">
        <textarea value={note} rows={3} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <ErrorText message={error} />
    </FormDialog>
  );
};
