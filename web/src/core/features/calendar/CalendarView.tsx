import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import ChevronLeftIcon from '@atlaskit/icon/core/chevron-left';
import ChevronRightIcon from '@atlaskit/icon/core/chevron-right';

interface CalendarCell {
  day: number;
  isCurrentMonth: boolean;
  isToday?: boolean;
}

export const CalendarView: React.FC = () => {
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');

  // Days of week
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
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '8px' }}>
      {/* Page Title */}
      <h1 style={{
        fontFamily: 'serif, "Times New Roman", Times, Georgia',
        fontSize: '32px',
        fontWeight: 700,
        color: token('color.text', '#172B4D'),
        margin: '0 0 6px 0'
      }}>
        Lịch chung
      </h1>
      <p style={{
        fontSize: '14px',
        color: token('color.text.subtle', '#5E6C84'),
        margin: '0 0 24px 0'
      }}>
        Lịch hoạt động và hạn chót công việc của các Tổ.
      </p>

      {/* Toolbar */}
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
          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: '4px',
              backgroundColor: token('elevation.surface', '#FFFFFF'),
              cursor: 'pointer',
              color: token('color.text', '#172B4D')
            }}
            title="Tháng trước"
          >
            <ChevronLeftIcon label="Previous" />
          </button>

          <span style={{ fontSize: '15px', fontWeight: 700, color: token('color.text', '#172B4D'), minWidth: '140px', textAlign: 'center' }}>
            Tháng 10 năm 2026
          </span>

          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: '4px',
              backgroundColor: token('elevation.surface', '#FFFFFF'),
              cursor: 'pointer',
              color: token('color.text', '#172B4D')
            }}
            title="Tháng sau"
          >
            <ChevronRightIcon label="Next" />
          </button>

          <button
            type="button"
            style={{
              height: '32px',
              padding: '0 12px',
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: '4px',
              backgroundColor: token('elevation.surface', '#FFFFFF'),
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              color: token('color.text', '#172B4D')
            }}
          >
            Hôm nay
          </button>
        </div>

        {/* Right Toolbar: Team Filter & View Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            style={{
              height: '32px',
              padding: '0 12px',
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: '4px',
              backgroundColor: token('elevation.surface', '#FFFFFF'),
              fontSize: '13px',
              color: token('color.text', '#172B4D'),
              cursor: 'pointer',
              outline: 'none',
              minWidth: '220px'
            }}
          >
            <option value="all">Tất cả các Tổ</option>
            <option value="to-1">Tổ 1</option>
            <option value="to-2">Tổ 2</option>
          </select>

          <div style={{
            display: 'flex',
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: '4px',
            overflow: 'hidden',
            backgroundColor: token('elevation.surface', '#FFFFFF')
          }}>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              style={{
                height: '32px',
                padding: '0 12px',
                border: 'none',
                backgroundColor: viewMode === 'month' ? token('color.background.neutral.subtle', '#F4F5F7') : 'transparent',
                fontWeight: viewMode === 'month' ? 600 : 400,
                fontSize: '13px',
                color: token('color.text', '#172B4D'),
                cursor: 'pointer'
              }}
            >
              Tháng
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                height: '32px',
                padding: '0 12px',
                border: 'none',
                borderLeft: `1px solid ${token('color.border', '#DFE1E6')}`,
                backgroundColor: viewMode === 'list' ? token('color.background.neutral.subtle', '#F4F5F7') : 'transparent',
                fontWeight: viewMode === 'list' ? 600 : 400,
                fontSize: '13px',
                color: token('color.text', '#172B4D'),
                cursor: 'pointer'
              }}
            >
              Danh sách
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div style={{
        backgroundColor: token('elevation.surface', '#FFFFFF'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)')
      }}>
        {/* Days of week header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
          backgroundColor: token('elevation.surface', '#FFFFFF')
        }}>
          {weekDays.map((day, idx) => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                padding: '10px 0',
                fontSize: '13px',
                fontWeight: 600,
                color: token('color.text.subtle', '#5E6C84'),
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
                  minHeight: '92px',
                  padding: '8px 10px',
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
                      width: '22px',
                      height: '22px',
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
                      fontWeight: 500,
                      color: cell.isCurrentMonth
                        ? token('color.text', '#172B4D')
                        : token('color.text.subtlest', '#A5ADBA')
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
