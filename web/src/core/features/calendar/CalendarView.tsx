import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import ChevronLeftIcon from '@atlaskit/icon/core/chevron-left';
import ChevronRightIcon from '@atlaskit/icon/core/chevron-right';

interface CalendarCell {
  day: number;
  isCurrentMonth: boolean;
  isToday?: boolean;
}

export const CalendarView: React.FC = () => {
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');

  // Days of week (Monday to Sunday)
  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  // Cells for October 2026
  const calendarCells: CalendarCell[] = [
    // Row 1 (Sept 28-30, Oct 1-4)
    { day: 28, isCurrentMonth: false },
    { day: 29, isCurrentMonth: false },
    { day: 30, isCurrentMonth: false },
    { day: 1, isCurrentMonth: true },
    { day: 2, isCurrentMonth: true },
    { day: 3, isCurrentMonth: true },
    { day: 4, isCurrentMonth: true },

    // Row 2 (Oct 5-11, day 8 is today)
    { day: 5, isCurrentMonth: true },
    { day: 6, isCurrentMonth: true },
    { day: 7, isCurrentMonth: true },
    { day: 8, isCurrentMonth: true, isToday: true },
    { day: 9, isCurrentMonth: true },
    { day: 10, isCurrentMonth: true },
    { day: 11, isCurrentMonth: true },

    // Row 3 (Oct 12-18)
    { day: 12, isCurrentMonth: true },
    { day: 13, isCurrentMonth: true },
    { day: 14, isCurrentMonth: true },
    { day: 15, isCurrentMonth: true },
    { day: 16, isCurrentMonth: true },
    { day: 17, isCurrentMonth: true },
    { day: 18, isCurrentMonth: true },

    // Row 4 (Oct 19-25)
    { day: 19, isCurrentMonth: true },
    { day: 20, isCurrentMonth: true },
    { day: 21, isCurrentMonth: true },
    { day: 22, isCurrentMonth: true },
    { day: 23, isCurrentMonth: true },
    { day: 24, isCurrentMonth: true },
    { day: 25, isCurrentMonth: true },

    // Row 5 (Oct 26-31, Nov 1)
    { day: 26, isCurrentMonth: true },
    { day: 27, isCurrentMonth: true },
    { day: 28, isCurrentMonth: true },
    { day: 29, isCurrentMonth: true },
    { day: 30, isCurrentMonth: true },
    { day: 31, isCurrentMonth: true },
    { day: 1, isCurrentMonth: false },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '4px' }}>
      {/* Page Header - synchronized with Dashboard style */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: 600,
          color: token('color.text', '#172B4D'),
          letterSpacing: '-0.2px'
        }}>
          Lịch chung
        </h1>
        <p style={{
          margin: '6px 0 0 0',
          fontSize: '14px',
          color: token('color.text.subtle', '#5E6C84')
        }}>
          Lịch hoạt động và hạn chót công việc của các Tổ.
        </p>
      </div>

      {/* Toolbar Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {/* Left Toolbar: Month Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button appearance="default" aria-label="Tháng trước">
            <ChevronLeftIcon label="Tháng trước" />
          </Button>

          <span style={{
            fontSize: '15px',
            fontWeight: 600,
            color: token('color.text', '#172B4D'),
            padding: '0 8px',
            minWidth: '150px',
            textAlign: 'center'
          }}>
            Tháng 10 năm 2026
          </span>

          <Button appearance="default" aria-label="Tháng sau">
            <ChevronRightIcon label="Tháng sau" />
          </Button>

          <Button appearance="default">
            Hôm nay
          </Button>
        </div>

        {/* Right Toolbar: Team Filter & View Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '220px' }}>
            <Select
              defaultValue={{ label: 'Tất cả các Tổ', value: 'all' }}
              options={[
                { label: 'Tất cả các Tổ', value: 'all' },
                { label: 'Phát triển Đảng và Chuyển đổi số', value: 'ptd_cds' },
                { label: 'Tuyên giáo - Truyền thông', value: 'tg_tt' },
                { label: 'Tổ chức - Kiểm tra', value: 'tc_kt' }
              ]}
              placeholder="Chọn Tổ"
            />
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <Button
              appearance={viewMode === 'month' ? 'primary' : 'default'}
              onClick={() => setViewMode('month')}
            >
              Tháng
            </Button>
            <Button
              appearance={viewMode === 'list' ? 'primary' : 'default'}
              onClick={() => setViewMode('list')}
            >
              Danh sách
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container - matching Atlassian card elevation & borders */}
      <div style={{
        backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: '3px',
        overflow: 'hidden',
        boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)')
      }}>
        {/* Days of week header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
          backgroundColor: token('elevation.surface', '#FAFBFC')
        }}>
          {weekDays.map((day, idx) => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                padding: '12px 0',
                fontSize: '12px',
                fontWeight: 700,
                color: token('color.text.subtle', '#5E6C84'),
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderRight: idx < 6 ? `1px solid ${token('color.border', '#DFE1E6')}` : 'none'
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 35 Month Grid Cells (5 rows x 7 cols) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)'
        }}>
          {calendarCells.map((cell, idx) => {
            const isLastCol = (idx + 1) % 7 === 0;
            const isLastRow = idx >= 28;

            return (
              <div
                key={idx}
                style={{
                  minHeight: '100px',
                  padding: '10px 12px',
                  backgroundColor: !cell.isCurrentMonth
                    ? token('color.background.neutral.subtle', '#F4F5F7')
                    : cell.isToday
                    ? token('color.background.selected', '#EBF3FF')
                    : token('elevation.surface', '#FFFFFF'),
                  borderRight: !isLastCol ? `1px solid ${token('color.border', '#DFE1E6')}` : 'none',
                  borderBottom: !isLastRow ? `1px solid ${token('color.border', '#DFE1E6')}` : 'none',
                  position: 'relative'
                }}
              >
                {cell.isToday ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: token('color.background.brand.bold', '#0052CC'),
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 700
                    }}
                  >
                    {cell.day}
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: cell.isCurrentMonth ? 600 : 400,
                      color: cell.isCurrentMonth
                        ? token('color.text', '#172B4D')
                        : token('color.text.disabled', '#A5ADBA')
                    }}
                  >
                    {cell.day}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
