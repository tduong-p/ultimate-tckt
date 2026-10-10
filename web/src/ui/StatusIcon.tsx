import './tokens.css';
import './ui.css';

export type Status = 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';

export interface StatusIconProps {
  status: Status;
  size?: number;
  title?: string;
}

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  todo: { label: 'Cần làm', color: 'var(--st-backlog)' },
  in_progress: { label: 'Đang làm', color: 'var(--st-active)' },
  review: { label: 'Chờ duyệt', color: 'var(--st-review)' },
  done: { label: 'Hoàn thành', color: 'var(--st-done)' },
  cancelled: { label: 'Đã huỷ', color: 'var(--st-blocked)' },
};

export function StatusIcon({ status, size = 14, title }: StatusIconProps) {
  const { label, color: c } = STATUS_CONFIG[status];
  const ariaLabel = title || label;

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={size}
      height={size}
      viewBox="0 0 14 14"
      focusable="false"
    >
      {title && <title>{title}</title>}
      {status === 'todo' && (
        <circle
          cx="7"
          cy="7"
          r="5.5"
          fill="none"
          stroke={c}
          strokeWidth="1.5"
          strokeDasharray="2 2"
        />
      )}
      {status === 'in_progress' && (
        <>
          <circle cx="7" cy="7" r="5.5" fill="none" stroke={c} strokeWidth="1.5" />
          <path d="M7 3.5a3.5 3.5 0 0 1 0 7z" fill={c} />
        </>
      )}
      {status === 'review' && (
        <>
          <circle cx="7" cy="7" r="5.5" fill="none" stroke={c} strokeWidth="1.5" />
          <path d="M7 3.5a3.5 3.5 0 1 1-3.5 3.5L7 7z" fill={c} />
        </>
      )}
      {status === 'cancelled' && (
        <>
          <circle cx="7" cy="7" r="5.5" fill="none" stroke={c} strokeWidth="1.5" />
          <path
            d="M5 5l4 4M9 5l-4 4"
            stroke={c}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </>
      )}
      {status === 'done' && (
        <>
          <circle cx="7" cy="7" r="6.25" fill={c} />
          <path
            d="M4.3 7.2l1.9 1.9 3.5-3.7"
            fill="none"
            stroke="#fff"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}
