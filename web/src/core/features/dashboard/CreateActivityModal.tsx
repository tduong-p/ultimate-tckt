import React from 'react';
import { token } from '@atlaskit/tokens';
import Form, { Field } from '@atlaskit/form';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import { Checkbox } from '@atlaskit/checkbox';
import TextArea from '@atlaskit/textarea';
import Button from '@atlaskit/button/new';
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
  QueryClientContext,
} from '@tanstack/react-query';
import { fetchTeams, createActivity, type CreateActivityPayload } from '../../api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const defaultModalQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});

export const CreateActivityModalContent: React.FC<Props> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();

  const { data: teams = [], isLoading: isLoadingTeams } = useQuery({
    queryKey: ['core-teams'],
    queryFn: fetchTeams,
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateActivityPayload) => createActivity(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['core-activities'] });
      queryClient.invalidateQueries({ queryKey: ['core-bootstrap'] });
      onClose();
    },
  });

  if (!isOpen) return null;

  const teamOptions = teams.map((t) => ({
    label: t.name,
    value: t.id,
  }));

  const handleSubmit = (formData: Record<string, any>) => {
    const leadTeamId = Number(
      formData.leadTeam?.value ?? formData.leadTeam ?? (teamOptions[0]?.value || 1)
    );

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
      title: (formData.title || '').trim(),
      description: (formData.description || '').trim(),
      type,
      team_id: leadTeamId,
      team_ids: teamIds,
      deadline: formData.deadline || '',
      start_date: formData.startDate || null,
      priority,
      location: formData.location ? String(formData.location).trim() : null,
      requested_by: formData.requestedBy ? String(formData.requestedBy).trim() : null,
      event_lead_id: formData.headOfEvent?.value ? Number(formData.headOfEvent.value) : null,
      proposal_document_url: formData.activityProfile
        ? String(formData.activityProfile).trim()
        : null,
      public_image_url: formData.publicImageUrl
        ? String(formData.publicImageUrl).trim()
        : null,
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
          backgroundColor: '#fff',
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
                      <Field
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
                      <Field name="leadTeam" label="Tổ chủ trì" defaultValue={null}>
                        {({ fieldProps }) => (
                          <Select
                            {...fieldProps}
                            placeholder="Chọn một Tổ"
                            options={teamOptions}
                            isLoading={isLoadingTeams}
                          />
                        )}
                      </Field>
                    </div>
                  </div>

                  <Field
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
                                isChecked={selectedIds.includes(t.value)}
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
                              {isLoadingTeams
                                ? 'Đang tải danh sách Tổ...'
                                : 'Không có Tổ nào'}
                            </span>
                          )}
                        </div>
                      );
                    }}
                  </Field>

                  <Field
                    name="headOfEvent"
                    label="Trưởng Ban Tổ Chức (không bắt buộc)"
                    defaultValue={{
                      label: 'Không chọn (phân công theo Ban chủ trì)',
                      value: '',
                    }}
                  >
                    {({ fieldProps }) => (
                      <Select
                        {...fieldProps}
                        options={[
                          {
                            label: 'Không chọn (phân công theo Ban chủ trì)',
                            value: '',
                          },
                        ]}
                      />
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
                      <Field
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

                  <Field
                    name="activityProfile"
                    label="Hồ sơ hoạt động"
                    defaultValue=""
                  >
                    {({ fieldProps }) => (
                      <Textfield
                        {...fieldProps}
                        placeholder="Liên kết hồ sơ hoạt động (không bắt buộc)"
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
                          label="Show this activity on the public landing page"
                        />
                      </div>
                    )}
                  </Field>

                  <Field
                    name="publicImageUrl"
                    label="Public image URL (optional)"
                    defaultValue=""
                  >
                    {({ fieldProps }) => (
                      <Textfield
                        {...fieldProps}
                        placeholder="https://example.com/activity.jpg"
                      />
                    )}
                  </Field>

                  <Field name="description" label="Mô tả" defaultValue="">
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
                {createMutation.isError && (
                  <div
                    style={{
                      color: token('color.text.danger', '#DE350B'),
                      marginBottom: '12px',
                      fontSize: '13px',
                      textAlign: 'center',
                    }}
                  >
                    Không thể tạo đề xuất. Vui lòng kiểm tra lại thông tin.
                  </div>
                )}
                <div style={{ width: '100%', padding: '0 24px' }}>
                  <Button
                    type="submit"
                    appearance="primary"
                    isLoading={createMutation.isPending}
                    style={{ width: '100%' }}
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

export const CreateActivityModal: React.FC<Props> = (props) => {
  const queryClient = React.useContext(QueryClientContext);

  if (!props.isOpen) return null;

  if (!queryClient) {
    return (
      <QueryClientProvider client={defaultModalQueryClient}>
        <CreateActivityModalContent {...props} />
      </QueryClientProvider>
    );
  }

  return <CreateActivityModalContent {...props} />;
};
