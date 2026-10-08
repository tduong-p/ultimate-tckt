import React from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';

interface Team {
  id: string;
  name: string;
  description: string;
  color: string;
  memberCount: number;
  activeCount: number;
}

const teamsData: Team[] = [
  {
    id: '1',
    name: 'Phát triển Đảng và Chuyển đổi số',
    description: 'Phụ trách công tác phát triển Đảng viên mới, quản lý dữ liệu và chuyển đổi số quy trình Đoàn.',
    color: '#0052CC',
    memberCount: 8,
    activeCount: 3
  },
  {
    id: '2',
    name: 'Tổ chức và Phát triển Đoàn',
    description: 'Tổ chức các phong trào thi đua, quản lý hồ sơ đoàn viên, chuyển sinh hoạt đoàn và đánh giá chi đoàn.',
    color: '#36B37E',
    memberCount: 12,
    activeCount: 5
  },
  {
    id: '3',
    name: 'Giám sát, Kiểm tra và Điểm rèn luyện',
    description: 'Theo dõi, đánh giá điểm rèn luyện sinh viên, giám sát kỷ luật và tiếp nhận phản hồi từ đoàn viên.',
    color: '#FF991F',
    memberCount: 6,
    activeCount: 2
  },
  {
    id: '4',
    name: 'Tuyên giáo - Truyền thông',
    description: 'Quản trị các kênh truyền thông, sản xuất ấn phẩm tuyên truyền, định hướng tư tưởng và sự kiện lớn.',
    color: '#6554C0',
    memberCount: 10,
    activeCount: 4
  }
];

export const TeamsView: React.FC = () => {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '4px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: 600,
          color: token('color.text', '#172B4D'),
          letterSpacing: '-0.2px'
        }}>
          Tổ
        </h1>
        <p style={{
          margin: '6px 0 0 0',
          fontSize: '14px',
          color: token('color.text.subtle', '#5E6C84')
        }}>
          Những con người và đơn vị cùng tạo nên các hoạt động.
        </p>
      </div>

      {/* Teams Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: '20px'
      }}>
        {teamsData.map((team) => (
          <div
            key={team.id}
            style={{
              backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: '6px',
              overflow: 'hidden',
              boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'),
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Top Color Accent */}
            <div style={{ height: '4px', backgroundColor: team.color, width: '100%' }} />

            {/* Card Content */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 600,
                  color: token('color.text', '#172B4D')
                }}>
                  {team.name}
                </h2>
                <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: team.color,
                  display: 'inline-block',
                  flexShrink: 0
                }} />
              </div>

              <p style={{
                margin: '0 0 20px 0',
                fontSize: '13px',
                color: token('color.text.subtle', '#5E6C84'),
                lineHeight: '1.45',
                flex: 1
              }}>
                {team.description}
              </p>

              {/* Stats */}
              <div style={{
                display: 'flex',
                gap: '32px',
                paddingTop: '16px',
                borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
                marginBottom: '16px'
              }}>
                <div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: token('color.text', '#172B4D')
                  }}>
                    {team.memberCount}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: token('color.text.subtle', '#5E6C84')
                  }}>
                    thành viên
                  </div>
                </div>

                <div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: token('color.text', '#172B4D')
                  }}>
                    {team.activeCount}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: token('color.text.subtle', '#5E6C84')
                  }}>
                    đang chạy
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <Button appearance="subtle">Xem hoạt động</Button>
                <Button appearance="default">Quản lý</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
