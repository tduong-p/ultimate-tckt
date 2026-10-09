import React, { useEffect, useState } from 'react';
import { token } from '@atlaskit/tokens';
import Form, { Field } from '@atlaskit/form';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import { Checkbox } from '@atlaskit/checkbox';
import TextArea from '@atlaskit/textarea';
import Button from '@atlaskit/button/new';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTeams, fetchBootstrap, fetchMembers, createActivity, apiErrorMessage, type CreateActivityPayload } from '../../api';
import { LinkField, LINK_ERROR_MESSAGE } from '../../../shared/components/LinkField';
import { isHttpUrl } from '../../../shared/utils/url';

type SelectOption<V> = { label: string; value: V };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Gọi với id hoạt động mới sau khi đóng modal (nơi gọi quyết định chuyển trang). */
  onCreated?: (id: number) => void;
}

export const CreateActivityModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const { data: teams = [], isLoading: isLoadingTeams } = useQuery({
    queryKey: ['core-teams'],
    queryFn: fetchTeams,
    enabled: isOpen,
  });

  // Quyền quyết định Tổ nào được chọn: admin/vice_admin (canCreateAccount) thấy mọi Tổ,
  // Tổ trưởng/Tổ phó chỉ được đề xuất cho Tổ mình lead (backend trả 403 nếu có Tổ khác,
  // kể cả Tổ phối hợp).
  const { data: bootstrap, isLoading: isLoadingCaps } = useQuery({
    queryKey: ['core-bootstrap'],
    queryFn: fetchBootstrap,
    enabled: isOpen,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['core-members'],
    queryFn: fetchMembers,
    enabled: isOpen,
  });
  // Tổ chủ trì luôn nằm trong các Tổ tham gia: form hiện nó đã đánh dấu và khoá.
  const [leadTeamId, setLeadTeamId] = useState<number | null>(null);

  const createMutation = useMutation({
    mutationFn: (payload: CreateActivityPayload) => createActivity(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['core-activities'] });
      queryClient.invalidateQueries({ queryKey: ['core-bootstrap'] });
      onClose();
      onCreated?.(data.id);
    },
  });

  const resetMutation = createMutation.reset;
  useEffect(() => {
    if (!isOpen) {
      setFormError(null);
      setLeadTeamId(null);
      resetMutation();
    }
  }, [isOpen, resetMutation]);

  if (!isOpen) return null;

  const isExecutive = Boolean(bootstrap?.capabilities?.canCreateAccount);
  const isLoadingList = isLoadingTeams || isLoadingCaps;
  const teamOptions = teams
    .filter((t) => isExecutive || Boolean(t.can_manage))
    .map((t) => ({
      label: t.name,
      value: t.id,
    }));
  const eventLeadOptions = members
    .filter((m) => m.is_active !== 0 && m.is_active !== false)
    .map((m) => ({ label: m.name, value: m.id }));
  const mutationError = apiErrorMessage(createMutation.error, 'Không thể tạo đề xuất. Vui lòng kiểm tra lại thông tin.');

  const handleSubmit = (formData: Record<string, any>) => {
    const leadTeamId = Number(formData.leadTeam?.value);
    const title = String(formData.title || '').trim();
    const description = String(formData.description || '').trim();
    const deadline = String(formData.deadline || '');
    if (!title || !description || !deadline) {
      setFormError('Vui lòng nhập tiêu đề, mô tả và hạn chung.');
      return;
    }
    if (!leadTeamId) {
      setFormError('Vui lòng chọn Tổ chủ trì.');
      return;
    }
    const startDate = String(formData.startDate || '');
    if (startDate && startDate > deadline) {
      setFormError('Ngày bắt đầu phải trước hoặc bằng hạn chung.');
      return;
    }
    const proposalUrl = String(formData.activityProfile || '').trim();
    const publicImageUrl = String(formData.publicImageUrl || '').trim();
    if ((proposalUrl && !isHttpUrl(proposalUrl)) || (publicImageUrl && !isHttpUrl(publicImageUrl))) {
      setFormError(LINK_ERROR_MESSAGE);
      return;
    }
    setFormError(null);

    const rawType = formData.activityType?.value || formData.activityType || 'event';
    const type =
      rawType === 'Chỉ đạo cấp trên'
        ? 'assigned'
        : rawType === 'Sự kiện do đơn vị đề xuất'
        ? 'event'
        : rawType;

    const priorityMap: Record<string, string> = {
      thấp: 'low',
      'trung bình': 'medium',
      cao: 'high',
      'khẩn cấp': 'urgent',
      low: 'low',
      medium: 'medium',
      high: 'high',
      urgent: 'urgent',
    };
    const rawPriority = formData.priority?.value || formData.priority || 'medium';
    const priority = priorityMap[String(rawPriority).toLowerCase()] || 'medium';

    const selectedTeams = Array.isArray(formData.participatingTeams)
      ? formData.participatingTeams.map(Number)
      : [];
    const teamIds = Array.from(new Set([leadTeamId, ...selectedTeams])).filter(Boolean);

    const payload: CreateActivityPayload = {
      title,
      description,
      type,
      team_id: leadTeamId,
      team_ids: teamIds,
      deadline,
      start_date: formData.startDate || null,
      priority,
      location: formData.location ? String(formData.location).trim() : null,
      requested_by: formData.requestedBy ? String(formData.requestedBy).trim() : null,
      event_lead_id: formData.eventLead?.value ?? null,
      proposal_document_url: proposalUrl || null,
      public_image_url: publicImageUrl || null,
      is_public: Boolean(formData.showOnPublicLandingPage),
    };

    createMutation.mutate(payload);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(9, 30, 66, 0.54)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: token('elevation.surface', '#fff'),
          borderRadius: '3px',
          width: '800px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 16px -4px rgba(9, 30, 66, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '24px 24px 16px 24px', flexShrink: 0 }}>
          <div style={{ padding: '16px 24px 0 24px', width: '100%' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: token('color.text.brand', '#0052CC'),
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '4px',
              }}
            >
              ĐỀ XUẤT MỚI
            </div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 500 }}>
              Đề xuất hoạt động
            </h2>
            <p
              style={{
                marginTop: '8px',
                color: token('color.text.subtle', '#42526E'),
                fontSize: '14px',
              }}
            >
              Chọn Tổ chủ trì và tất cả các Tổ phối hợp tham gia.
            </p>
          </div>
        </div>

        <Form onSubmit={handleSubmit}>
          {({ formProps }) => (
            <form
              {...formProps}
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
              }}
            >
              <div style={{ padding: '0 24px', overflowY: 'auto', flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    paddingBottom: '16px',
                  }}
                >
                  <Field name="title" label="Tiêu đề" defaultValue="">
                    {({ fieldProps }) => (
                      <Textfield
                        {...fieldProps}
                        placeholder="ví dụ: Ngày hội Kỹ thuật"
                      />
                    )}
                  </Field>

                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <Field<SelectOption<string> | null>
                        name="activityType"
                        label="Loại hoạt động"
                        defaultValue={{
                          label: 'Sự kiện do đơn vị đề xuất',
                          value: 'event',
                        }}
                      >
                        {({ fieldProps }) => (
                          <Select
                            {...fieldProps}
                            options={[
                              {
                                label: 'Sự kiện do đơn vị đề xuất',
                                value: 'event',
                              },
                              {
                                label: 'Chỉ đạo cấp trên',
                                value: 'assigned',
                              },
                            ]}
                          />
                        )}
                      </Field>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Field<SelectOption<number> | null> name="leadTeam" label="Tổ chủ trì" defaultValue={null}>
                        {({ fieldProps }) => (
                          <Select
                            {...fieldProps}
                            onChange={(option) => {
                              fieldProps.onChange(option);
                              setLeadTeamId((option as SelectOption<number> | null)?.value ?? null);
                            }}
                            placeholder="Chọn một Tổ"
                            options={teamOptions}
                            isLoading={isLoadingList}
                          />
                        )}
                      </Field>
                    </div>
                  </div>

                  <Field<number[]>
                    name="participatingTeams"
                    label="Các Tổ tham gia"
                    defaultValue={[]}
                  >
                    {({ fieldProps }) => {
                      const selectedIds: number[] = Array.isArray(fieldProps.value)
                        ? fieldProps.value
                        : [];
                      return (
                        <div
                          style={{
                            border: `1px solid ${token('color.border', '#DFE1E6')}`,
                            borderRadius: '3px',
                            padding: '8px 12px',
                            maxHeight: '140px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                          }}
                        >
                          {teamOptions.length > 0 ? (
                            teamOptions.map((t) => (
                              <Checkbox
                                key={t.value}
                                label={t.label}
                                value={String(t.value)}
                                isChecked={selectedIds.includes(t.value) || t.value === leadTeamId}
                                isDisabled={t.value === leadTeamId}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...selectedIds, t.value]
                                    : selectedIds.filter((id) => id !== t.value);
                                  fieldProps.onChange(next);
                                }}
                              />
                            ))
                          ) : (
                            <span
                              style={{
                                fontSize: '13px',
                                color: token('color.text.subtle', '#6B778C'),
                              }}
                            >
                              {isLoadingList
                                ? 'Đang tải danh sách Tổ...'
                                : 'Không có Tổ nào bạn được phép đề xuất'}
                            </span>
                          )}
                        </div>
                      );
                    }}
                  </Field>

                  <Field<SelectOption<number> | null>
                    name="eventLead"
                    label="Trưởng Ban Tổ chức (không bắt buộc)"
                    defaultValue={null}
                  >
                    {({ fieldProps }) => (
                      <Select {...fieldProps} isClearable placeholder="Chọn một người" options={eventLeadOptions} />
                    )}
                  </Field>

                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <Field name="startDate" label="Ngày bắt đầu" defaultValue="">
                        {({ fieldProps }) => {
                          const { isDisabled, isInvalid, isRequired, ...rest } =
                            fieldProps;
                          return (
                            <input
                              type="date"
                              {...rest}
                              disabled={isDisabled}
                              required={isRequired}
                              style={{
                                width: '100%',
                                padding: '8px',
                                border: `2px solid ${token(
                                  'color.border',
                                  '#DFE1E6'
                                )}`,
                                borderRadius: '3px',
                                fontSize: '14px',
                                backgroundColor: token(
                                  'elevation.surface',
                                  '#FAFBFC'
                                ),
                                color: token('color.text', '#172B4D'),
                                boxSizing: 'border-box',
                              }}
                            />
                          );
                        }}
                      </Field>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Field name="deadline" label="Hạn chung" defaultValue="">
                        {({ fieldProps }) => {
                          const { isDisabled, isInvalid, isRequired, ...rest } =
                            fieldProps;
                          return (
                            <input
                              type="date"
                              {...rest}
                              disabled={isDisabled}
                              required={isRequired}
                              style={{
                                width: '100%',
                                padding: '8px',
                                border: `2px solid ${token(
                                  'color.border',
                                  '#DFE1E6'
                                )}`,
                                borderRadius: '3px',
                                fontSize: '14px',
                                backgroundColor: token(
                                  'elevation.surface',
                                  '#FAFBFC'
                                ),
                                color: token('color.text', '#172B4D'),
                                boxSizing: 'border-box',
                              }}
                            />
                          );
                        }}
                      </Field>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <Field<SelectOption<string> | null>
                        name="priority"
                        label="Mức ưu tiên"
                        defaultValue={{ label: 'Trung bình', value: 'medium' }}
                      >
                        {({ fieldProps }) => (
                          <Select
                            {...fieldProps}
                            options={[
                              { label: 'Thấp', value: 'low' },
                              { label: 'Trung bình', value: 'medium' },
                              { label: 'Cao', value: 'high' },
                              { label: 'Khẩn cấp', value: 'urgent' },
                            ]}
                          />
                        )}
                      </Field>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Field name="location" label="Địa điểm" defaultValue="">
                        {({ fieldProps }) => (
                          <Textfield
                            {...fieldProps}
                            placeholder="Không bắt buộc"
                          />
                        )}
                      </Field>
                    </div>
                  </div>

                  <Field
                    name="requestedBy"
                    label="Được yêu cầu bởi"
                    defaultValue=""
                  >
                    {({ fieldProps }) => (
                      <Textfield
                        {...fieldProps}
                        placeholder="Dành cho công việc do lãnh đạo giao"
                      />
                    )}
                  </Field>

                  <Field name="activityProfile" label="" defaultValue="">
                    {({ fieldProps }) => (
                      <LinkField
                        label="Hồ sơ hoạt động (đề án, không bắt buộc)"
                        value={String(fieldProps.value ?? '')}
                        onChange={(value) => fieldProps.onChange(value)}
                      />
                    )}
                  </Field>

                  <Field
                    name="showOnPublicLandingPage"
                    label=""
                    defaultValue={false}
                  >
                    {({ fieldProps }) => (
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <Checkbox
                          isChecked={Boolean(fieldProps.value)}
                          onChange={(e) => fieldProps.onChange(e.target.checked)}
                          label="Hiển thị hoạt động này trên trang công khai"
                        />
                      </div>
                    )}
                  </Field>

                  <Field name="publicImageUrl" label="" defaultValue="">
                    {({ fieldProps }) => (
                      <LinkField
                        label="Liên kết ảnh công khai (không bắt buộc)"
                        value={String(fieldProps.value ?? '')}
                        onChange={(value) => fieldProps.onChange(value)}
                        placeholder="https://example.com/activity.jpg"
                      />
                    )}
                  </Field>

                  <Field<string, HTMLTextAreaElement> name="description" label="Mô tả" defaultValue="">
                    {({ fieldProps }) => (
                      <TextArea
                        {...fieldProps}
                        placeholder="Hoạt động hướng đến mục tiêu gì?"
                        minimumRows={4}
                      />
                    )}
                  </Field>
                </div>
              </div>
              <div
                style={{
                  padding: '16px 24px 24px 24px',
                  flexShrink: 0,
                }}
              >
                {formError && (
                  <div
                    role="alert"
                    style={{
                      color: token('color.text.danger', '#DE350B'),
                      marginBottom: '12px',
                      fontSize: '13px',
                      textAlign: 'center',
                    }}
                  >
                    {formError}
                  </div>
                )}
                {createMutation.isError && (
                  <div
                    role="alert"
                    style={{
                      color: token('color.text.danger', '#DE350B'),
                      marginBottom: '12px',
                      fontSize: '13px',
                      textAlign: 'center',
                    }}
                  >
                    {mutationError}
                  </div>
                )}
                <div style={{ width: '100%', padding: '0 24px' }}>
                  <Button
                    type="submit"
                    appearance="primary"
                    isLoading={createMutation.isPending}
                    shouldFitContainer
                  >
                    Tạo đề xuất
                  </Button>
                </div>
              </div>
            </form>
          )}
        </Form>
      </div>
    </div>
  );
};
