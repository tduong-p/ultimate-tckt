/** Modern Enterprise B2B SaaS Design Tokens
 *  Inspired by Linear / Raycast / Modern HRIS.
 *  Cool gray outer canvas (#f0f2f5), pure white surfaces (#ffffff),
 *  dark slate text (#111827), fine 1px borders (#e5e7eb),
 *  and true capsule status pills (#f0fdf4, #fef2f2, #fffbeb, #eff6ff).
 */

// Surfaces & Canvas
export const BG_CANVAS = "#f0f2f5";
export const CANVAS = BG_CANVAS;
export const BG = BG_CANVAS;

export const SURFACE = "#ffffff";
export const PAPER = SURFACE;
export const BG_ALT = "#f8fafc";
export const WHITE = SURFACE;

// Typography & Ink
export const INK = "#111827"; // Primary dark text
export const TEXT_PRIMARY = INK;
export const MUTED = "#6b7280"; // Secondary muted gray text
export const TEXT_SECONDARY = MUTED;
export const FAINT = "#9ca3af"; // Placeholder & icons
export const TEXT_MUTED = FAINT;

// Borders & Dividers
export const LINE = "#e5e7eb"; // Crisp 1px border
export const LINE_SOFT = "#f1f5f9"; // Table row inner border

// Accent & Buttons
export const RED = "#dc2626";
export const NAVY = "#0f172a"; // Carbon black for primary buttons / branding
export const NAVY_700 = "#020617";
export const ACCENT_BLUE = "#2563eb";

// Radii
export const RADIUS = 12; // Standard card radius
export const CONTAINER_RADIUS = 16; // Outer floating frame radius
export const BUTTON_RADIUS = 8; // Button radius (8-10px)
export const PILL_RADIUS = 9999; // True capsule pill radius

// Typography Scale
export const FONT = "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif";
export const MONO = "'JetBrains Mono', 'IBM Plex Mono', monospace";
export const DISPLAY_WEIGHT = 600;
export const DISPLAY_TRACKING = "-0.025em";

// Modern Capsule Status Pills (Matching Reference Image)
export const STATUS_PILL = {
  active: { bg: "#f0fdf4", fg: "#15803d", border: "#86efac" }, // Green - Hoàn tất / Đạt
  inactive: { bg: "#fef2f2", fg: "#b91c1c", border: "#fca5a5" }, // Red - Không đạt / Huỷ
  onboarding: { bg: "#fffbeb", fg: "#b45309", border: "#fcd34d" }, // Amber - Cần bổ sung / Đang chờ
  processing: { bg: "#eff6ff", fg: "#1d4ed8", border: "#93c5fd" }, // Blue - Đang kiểm tra
  neutral: { bg: "#f8fafc", fg: "#475569", border: "#cbd5e1" }, // Gray - Bản nháp
} as const;

export type Tone = "info" | "warn" | "ok" | "danger" | "neutral";

export const TONE: Record<Tone, { bg: string; fg: string; border?: string }> = {
  info: STATUS_PILL.processing,
  warn: STATUS_PILL.onboarding,
  ok: STATUS_PILL.active,
  danger: STATUS_PILL.inactive,
  neutral: STATUS_PILL.neutral,
};

// Aliases for compatibility with older components
export const CANDY = {
  blue: STATUS_PILL.processing,
  peach: STATUS_PILL.onboarding,
  lime: STATUS_PILL.active,
  pink: { bg: "#fdf2f8", fg: "#be185d", border: "#fbcfe8" },
  coral: STATUS_PILL.inactive,
} as const;

export const SLA_WARN_DAYS = 5;


