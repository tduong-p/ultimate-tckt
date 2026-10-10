import './tokens.css';
import './ui.css';

export type Priority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export interface PriorityIconProps {
  priority: Priority;
  size?: number;
}

const PRIORITY_LABELS: Record<Priority, string> = {
  none: 'Không ưu tiên',
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  urgent: 'Khẩn cấp',
};

export function PriorityIcon({ priority, size = 14 }: PriorityIconProps) {
  const label = PRIORITY_LABELS[priority];

  if (priority === 'urgent') {
    return (
      <svg
        role="img"
        aria-label={label}
        width={size}
        height={size}
        viewBox="0 0 14 14"
        focusable="false"
      >
        <rect x="1" y="1" width="12" height="12" rx="3" fill="var(--pr-urgent)" />
        <path
          d="M7 4v3.6M7 9.6v.2"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const level =
    priority === 'high' ? 3 : priority === 'medium' ? 2 : priority === 'low' ? 1 : 0;

  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox="0 0 14 14"
      focusable="false"
    >
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={2 + i * 4}
          y={9 - i * 3}
          width="2.4"
          height={3 + i * 3}
          rx="0.8"
          fill={
            level === 0
              ? 'var(--text-faint)'
              : i < level
              ? 'var(--text-2)'
              : 'var(--border-strong)'
          }
          opacity={level === 0 ? 0.6 : 1}
        />
      ))}
    </svg>
  );
}
