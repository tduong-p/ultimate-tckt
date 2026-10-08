import React from 'react';
import { token } from '@atlaskit/tokens';
import Form, { Field } from '@atlaskit/form';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import { Checkbox } from '@atlaskit/checkbox';
import TextArea from '@atlaskit/textarea';
import Button from '@atlaskit/button/new';
import { createPortal } from 'react-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateActivityModal: React.FC<Props> = ({ isOpen, onClose }) => {
  return (
    <>
      
      {isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(9, 30, 66, 0.54)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }} onClick={onClose}>
          <div style={{ backgroundColor: '#fff', borderRadius: '3px', width: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 16px -4px rgba(9, 30, 66, 0.25)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px 24px 16px 24px', flexShrink: 0 }}>
          <div style={{ padding: '16px 24px 0 24px', width: '100%' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: token('color.text.brand', '#0052CC'), textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              ĐỀ XUẤT MỚI
            </div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 500 }}>Đề xuất hoạt động</h2>
            <p style={{ marginTop: '8px', color: token('color.text.subtle', '#42526E'), fontSize: '14px' }}>
              Chọn Tổ chủ trì và tất cả các Tổ phối hợp tham gia.
            </p>
          </div>
        </div>
        <Form onSubmit={(data) => { console.log(data); onClose(); }}>
          {({ formProps }) => (
            <form {...formProps} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ padding: '0 24px', overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '16px' }}>
                  
                  <Field name="title" label="Tiêu đề" defaultValue="">
                    {({ fieldProps }) => (
                      <Textfield {...fieldProps} placeholder="ví dụ: Ngày hội Kỹ thuật" />
                    )}
                  </Field>

                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <Field name="activityType" label="Loại hoạt động" defaultValue={{ label: 'Sự kiện do đơn vị đề xuất', value: 'Sự kiện do đơn vị đề xuất' }}>
                        {({ fieldProps }) => (
                          <Select {...fieldProps} options={[{ label: 'Sự kiện do đơn vị đề xuất', value: 'Sự kiện do đơn vị đề xuất' }]} />
                        )}
                      </Field>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Field name="leadTeam" label="Tổ chủ trì" defaultValue={null}>
                        {({ fieldProps }) => (
                          <Select {...fieldProps} placeholder="Chọn một Tổ" options={[]} />
                        )}
                      </Field>
                    </div>
                  </div>

                  <Field name="participatingTeams" label="Các Tổ tham gia" defaultValue={[]}>
                    {({ fieldProps }) => (
                      <div style={{ border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: '3px', padding: '8px 12px' }}>
                        <Checkbox {...fieldProps} label="Phát triển Đảng và Chuyển đổi số" value="PTD_CDS" />
                      </div>
                    )}
                  </Field>

                  <Field name="headOfEvent" label="Trưởng Ban Tổ Chức (không bắt buộc)" defaultValue={{ label: 'Không chọn (phân công theo Ban chủ trì)', value: '' }}>
                    {({ fieldProps }) => (
                      <Select {...fieldProps} options={[{ label: 'Không chọn (phân công theo Ban chủ trì)', value: '' }]} />
                    )}
                  </Field>

                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <Field name="startDate" label="Ngày bắt đầu" defaultValue="">
                        {({ fieldProps }) => (
                          <input type="date" {...fieldProps} style={{ width: '100%', padding: '8px', border: `2px solid ${token('color.border', '#DFE1E6')}`, borderRadius: '3px', fontSize: '14px', backgroundColor: token('elevation.surface', '#FAFBFC'), color: token('color.text', '#172B4D') }} />
                        )}
                      </Field>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Field name="deadline" label="Hạn chung" defaultValue="">
                        {({ fieldProps }) => (
                          <input type="date" {...fieldProps} style={{ width: '100%', padding: '8px', border: `2px solid ${token('color.border', '#DFE1E6')}`, borderRadius: '3px', fontSize: '14px', backgroundColor: token('elevation.surface', '#FAFBFC'), color: token('color.text', '#172B4D') }} />
                        )}
                      </Field>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <Field name="priority" label="Mức ưu tiên" defaultValue={{ label: 'trung bình', value: 'trung bình' }}>
                        {({ fieldProps }) => (
                          <Select {...fieldProps} options={[{ label: 'trung bình', value: 'trung bình' }]} />
                        )}
                      </Field>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Field name="location" label="Địa điểm" defaultValue="">
                        {({ fieldProps }) => (
                          <Textfield {...fieldProps} placeholder="Không bắt buộc" />
                        )}
                      </Field>
                    </div>
                  </div>

                  <Field name="requestedBy" label="Được yêu cầu bởi" defaultValue="">
                    {({ fieldProps }) => (
                      <Textfield {...fieldProps} placeholder="Dành cho công việc do lãnh đạo giao" />
                    )}
                  </Field>

                  <Field name="activityProfile" label="Hồ sơ hoạt động" defaultValue="">
                    {({ fieldProps }) => (
                      <Textfield {...fieldProps} placeholder="Liên kết hồ sơ hoạt động (không bắt buộc)" />
                    )}
                  </Field>

                  <Field name="showOnPublicLandingPage" label="" defaultValue={false}>
                    {({ fieldProps }) => (
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                         <Checkbox {...fieldProps} label="Show this activity on the public landing page" />
                      </div>
                    )}
                  </Field>

                  <Field name="publicImageUrl" label="Public image URL (optional)" defaultValue="">
                    {({ fieldProps }) => (
                      <Textfield {...fieldProps} placeholder="https://example.com/activity.jpg" />
                    )}
                  </Field>

                  <Field name="description" label="Mô tả" defaultValue="">
                    {({ fieldProps }) => (
                      <TextArea {...fieldProps} placeholder="Hoạt động hướng đến mục tiêu gì?" minimumRows={4} />
                    )}
                  </Field>

                </div>
              </div>
              <div style={{ padding: '16px 24px 24px 24px', flexShrink: 0 }}>
                <div style={{ width: '100%', padding: '0 24px 24px 24px' }}>
                  <Button type="submit" appearance="primary" style={{ width: '100%' }}>
                    Tạo đề xuất
                  </Button>
                </div>
              </div>
            </form>
          )}
        </Form>
      </div>
        </div>
      )}

    </>
  );
};
