import React, { useEffect, useMemo, useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { addActivityParticipants, type ActivityDetail } from '../../api';
import { PeoplePicker } from '../../../shared/components/PeoplePicker';
import { ErrorText, FieldRow, NativeSelect } from './formBits';
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
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="medium">
          <ModalHeader>
            <ModalTitle>Thêm người tham gia</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <FieldRow label="Lọc theo Tổ" htmlFor="add-participants-team">
              <NativeSelect
                id="add-participants-team"
                value={teamFilter}
                options={[{ value: '', label: 'Tất cả các Tổ' }, ...detail.activityTeams.map((team) => ({ value: String(team.team_id), label: team.name }))]}
                onChange={setTeamFilter}
              />
            </FieldRow>
            <PeoplePicker label="Chọn người tham gia" people={candidates} value={selected} onChange={setSelected} excludeIds={taken} />
            <div style={{ marginTop: 12 }}>
              <FieldRow label="Vai trò" htmlFor="add-participants-role">
                <Textfield id="add-participants-role" value={responsibility} onChange={(event) => setResponsibility((event.target as HTMLInputElement).value)} />
              </FieldRow>
            </div>
            {error && <ErrorText>{error}</ErrorText>}
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>
              Huỷ
            </Button>
            <Button appearance="primary" isLoading={add.isPending} onClick={submit}>
              Thêm
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
};
