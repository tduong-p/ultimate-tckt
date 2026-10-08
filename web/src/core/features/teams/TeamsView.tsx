import React from 'react';
import { token } from '@atlaskit/tokens';
import { LottieLoading } from '../../../shared/components/LottieLoading';
import InboxIcon from '@atlaskit/icon/core/inbox';
import { useQuery } from '@tanstack/react-query';
import { fetchTeams, type TeamItem } from '../../api';

export const TeamsView: React.FC = () => {
  const { data: teams, isLoading, isError } = useQuery({
    queryKey: ['core-teams'],
    queryFn: fetchTeams,
  });

  if (isError) {
    return (
      <div style={{ color: token('color.text.danger', '#DE350B'), padding: '16px' }}>
        Lỗi tải dữ liệu Tổ
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '4px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: 600,
            color: token('color.text', '#172B4D'),
            letterSpacing: '-0.2px',
          }}
        >
          Tổ
        </h1>
        <p
          style={{
            margin: '6px 0 0 0',
            fontSize: '14px',
            color: token('color.text.subtle', '#5E6C84'),
          }}
        >
          Những con người và đơn vị cùng tạo nên các hoạt động.
        </p>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <LottieLoading message="Đang tải danh sách tổ..." size={140} />
      ) : !teams || teams.length === 0 ? (
        /* Empty State */
        <div
          style={{
            backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: '6px',
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          <div style={{ color: token('color.icon.subtle', '#6B778C') }}>
            <InboxIcon label="" />
          </div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: token('color.text', '#172B4D'),
            }}
          >
            Chưa có tổ nào
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: token('color.text.subtle', '#5E6C84'),
            }}
          >
            Danh sách tổ hiện tại đang trống.
          </p>
        </div>
      ) : (
        /* Teams Grid */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '20px',
          }}
        >
          {teams.map((team: TeamItem) => {
            const teamColor = team.color || '#0052CC';
            const memberCount = team.member_count ?? (team as any).memberCount ?? 0;
            const activeCount = team.active_count ?? (team as any).activeCount ?? 0;

            return (
              <div
                key={team.id}
                style={{
                  backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
                  border: `1px solid ${token('color.border', '#DFE1E6')}`,
                  borderRadius: '6px',
                  overflow: 'hidden',
                  boxShadow: token(
                    'elevation.shadow.raised',
                    '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'
                  ),
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Top Color Accent */}
                <div style={{ height: '4px', backgroundColor: teamColor, width: '100%' }} />

                {/* Card Content */}
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: 600,
                        color: token('color.text', '#172B4D'),
                      }}
                    >
                      {team.name}
                    </h2>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: teamColor,
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                  </div>

                  <p
                    style={{
                      margin: '0 0 20px 0',
                      fontSize: '13px',
                      color: token('color.text.subtle', '#5E6C84'),
                      lineHeight: '1.45',
                      flex: 1,
                    }}
                  >
                    {team.description || ''}
                  </p>

                  {/* Stats */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '32px',
                      paddingTop: '16px',
                      borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
                      marginBottom: '16px',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '20px',
                          fontWeight: 700,
                          color: token('color.text', '#172B4D'),
                        }}
                      >
                        {memberCount}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: token('color.text.subtle', '#5E6C84'),
                        }}
                      >
                        thành viên
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: '20px',
                          fontWeight: 700,
                          color: token('color.text', '#172B4D'),
                        }}
                      >
                        {activeCount}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: token('color.text.subtle', '#5E6C84'),
                        }}
                      >
                        đang chạy
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
