import React, { useEffect, useMemo, useState } from 'react';
import { Button, Dialog, Select } from '../../../ui';
import { addActivityParticipants, type ActivityDetail } from '../../api';
import { PeoplePicker } from '../../../shared/components/PeoplePicker';
import { useActivityMutation } from './useActivityMutation';

export const DEFAULT_RESPONSIBILITY = 'Người tham gia hoạt động';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  detail: ActivityDetail;
}

export const AddParticipantsModal: React.FC<Props> = ({ isOpen, onClose, detail }) => {
  const [selected, setSelected] = useState<number[]>([]);
  const [teamFilter, setTeamFilter] = useState('');
  const [responsibility, setResponsibility] = useState(DEFAULT_RESPONSIBILITY);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelected([]);
      setTeamFilter('');
      setResponsibility(DEFAULT_RESPONSIBILITY);
      setError('');
    }
  }, [isOpen]);

  const taken = useMemo(
    () => detail.participants.filter((participant) => participant.state !== 'declined').map((participant) => Number(participant.user_id)),
    [detail.participants]
  );
  const candidates = useMemo(() => {
    const teamId = Number(teamFilter);
    return detail.people
      .filter((person) => !teamId || person.team_ids.includes(teamId) || selected.includes(person.id))
      .map((person) => ({ id: person.id, name: person.name }));
  }, [detail.people, teamFilter, selected]);

  const add = useActivityMutation(
    detail.activity.id,
    (payload: { user_ids: number[]; responsibility: string }) => addActivityParticipants(detail.activity.id, payload),
    { message: 'Đã thêm người tham gia.', onDone: onClose }
  );

  const submit = () => {
    if (selected.length === 0) {
      setError('Hãy chọn ít nhất một thành viên.');
      return;
    }
    setError('');
    add.mutate({ user_ids: selected, responsibility: responsibility.trim() || DEFAULT_RESPONSIBILITY });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => { if (!next) onClose(); }}
      title="Thêm người tham gia"
      footer={(
        <>
          <Button onClick={onClose}>Huỷ</Button>
          <Button variant="primary" disabled={add.isPending} onClick={submit}>Thêm</Button>
        </>
      )}
    >
      <div className="act-form-row">
        <label htmlFor="add-participants-team">Lọc theo Tổ</label>
        <Select
          id="add-participants-team"
          value={teamFilter}
          options={[{ value: '', label: 'Tất cả các Tổ' }, ...detail.activityTeams.map((team) => ({ value: String(team.team_id), label: team.name }))]}
          onChange={setTeamFilter}
        />
      </div>
      <PeoplePicker label="Chọn người tham gia" people={candidates} value={selected} onChange={setSelected} excludeIds={taken} />
      <div className="act-form-row">
        <label htmlFor="add-participants-role">Vai trò</label>
        <input id="add-participants-role" className="act-input act-input--wide" value={responsibility} onChange={(event) => setResponsibility(event.target.value)} />
      </div>
      {error && <p role="alert" className="act-field-error">{error}</p>}
    </Dialog>
  );
};
