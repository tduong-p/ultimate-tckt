import './tokens.css';
import './ui.css';

export interface AvatarProps {
  name: string;
  src?: string;
  size?: number;
}

const PALETTE = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#6366f1',
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  const first = words[words.length - 2];
  const second = words[words.length - 1];
  return (first[0] + second[0]).toUpperCase();
}

export function Avatar({ name, src, size = 20 }: AvatarProps) {
  if (src) {
    return (
      <span className="ui-avatar" style={{ width: size, height: size }}>
        <img src={src} alt={name} />
      </span>
    );
  }

  const initials = getInitials(name);
  const colorIndex = hashName(name) % PALETTE.length;
  const backgroundColor = PALETTE[colorIndex];
  const fontSize = Math.max(8, Math.round(size * 0.42));

  return (
    <span
      className="ui-avatar"
      role="img"
      aria-label={name}
      style={{
        width: size,
        height: size,
        backgroundColor,
        fontSize,
      }}
    >
      {initials}
    </span>
  );
}
