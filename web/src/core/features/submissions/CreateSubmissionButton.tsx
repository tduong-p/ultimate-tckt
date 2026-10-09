import React, { useState } from 'react';
import Button from '@atlaskit/button/new';
import { useDhActor } from '../dieuhanh/useDhActor';
import { canCreateSubmission } from '../dieuhanh/permissions';
import { CreateSubmissionModal, type SubmissionPreset } from './CreateSubmissionModal';

/** Nút "Trình lên…" đặt cạnh một hoạt động / nhật ký trực ban. Tự ẩn khi không có quyền hoặc đơn vị không có module Điều hành. */
export const CreateSubmissionButton: React.FC<{ preset: SubmissionPreset }> = ({ preset }) => {
  const actor = useDhActor();
  const [open, setOpen] = useState(false);
  if (!actor.hasDieuHanh || !canCreateSubmission(actor)) return null;
  return (
    <>
      <Button onClick={() => setOpen(true)}>Trình lên…</Button>
      <CreateSubmissionModal isOpen={open} onClose={() => setOpen(false)} preset={preset} />
    </>
  );
};
