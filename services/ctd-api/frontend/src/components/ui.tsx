import { useState, type CSSProperties, type ReactNode } from "react";
import {
  BUTTON_RADIUS,
  DISPLAY_TRACKING,
  DISPLAY_WEIGHT,
  FONT,
  INK,
  LINE,
  LINE_SOFT,
  MONO,
  MUTED,
  PAPER,
  RADIUS,
  STATUS_PILL,
  TONE,
  type Tone,
} from "../theme/tokens";

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  pastel?: "blue" | "peach" | "lime" | "pink" | "coral";
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: PAPER,
        color: INK,
        border: `1px solid ${LINE}`,
        borderRadius: RADIUS,
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function DisplayTitle({
  children,
  size = 22,
  style,
}: {
  children: ReactNode;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: size,
        fontWeight: DISPLAY_WEIGHT,
        letterSpacing: DISPLAY_TRACKING,
        lineHeight: 1.2,
        color: INK,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionLabel({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: MUTED,
        letterSpacing: ".04em",
        textTransform: "uppercase",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function ScreenTag({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        letterSpacing: ".06em",
        textTransform: "uppercase",
        color: MUTED,
        fontFamily: MONO,
        ...style,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: MUTED }} />
      {children}
    </div>
  );
}

export function Pill({
  tone,
  children,
  style,
}: {
  tone: Tone;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const t = TONE[tone] || STATUS_PILL.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 500,
        padding: "3px 12px",
        borderRadius: 9999,
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.border || LINE}`,
        lineHeight: 1.4,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function Avatar({
  name,
  src,
  size = 32,
  style,
}: {
  name: string;
  src?: string;
  size?: number;
  style?: CSSProperties;
}) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(-2)
      .map((w) => w[0].toUpperCase())
      .join("") || "SV";

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: src ? "transparent" : "#f1f5f9",
        color: "#475569",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.38),
        fontWeight: 600,
        fontFamily: FONT,
        flexShrink: 0,
        border: `1px solid ${LINE}`,
        overflow: "hidden",
        ...style,
      }}
    >
      {src ? (
        <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initials
      )}
    </div>
  );
}

export function KpiCard({
  icon,
  label,
  value,
  delta,
  deltaPositive = true,
  style,
}: {
  icon?: ReactNode;
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: PAPER,
        border: `1px solid ${LINE}`,
        borderRadius: RADIUS,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
        flex: 1,
        minWidth: 160,
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: "#f8fafc",
            border: `1px solid ${LINE_SOFT}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: INK,
            fontSize: 16,
          }}
        >
          {icon || "👤"}
        </div>
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: INK,
              fontFamily: FONT,
            }}
          >
            {value}
          </span>
          {delta && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: deltaPositive ? "#10b981" : "#ef4444",
              }}
            >
              {delta}
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  style,
}: {
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        ...style,
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 10,
          color: MUTED,
          fontSize: 14,
          pointerEvents: "none",
        }}
      >
        🔍
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        style={{
          padding: "7px 34px 7px 32px",
          borderRadius: BUTTON_RADIUS,
          border: `1px solid ${LINE}`,
          background: PAPER,
          color: INK,
          fontSize: 13,
          fontFamily: FONT,
          outline: "none",
          width: "100%",
        }}
      />
      <span
        style={{
          position: "absolute",
          right: 8,
          fontSize: 11,
          fontWeight: 600,
          color: MUTED,
          background: "#f1f5f9",
          border: `1px solid ${LINE}`,
          borderRadius: 4,
          padding: "1px 5px",
          pointerEvents: "none",
          fontFamily: MONO,
        }}
      >
        ⌘ F
      </span>
    </div>
  );
}

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  disabled?: boolean;
  style?: CSSProperties;
};

export function Button({
  children,
  onClick,
  variant = "outline",
  disabled,
  style,
}: ButtonProps) {
  const base: CSSProperties = {
    fontFamily: FONT,
    borderRadius: BUTTON_RADIUS,
    padding: "8px 16px",
    fontSize: 13.5,
    fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 120ms ease-in-out",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    outline: "none",
  };

  const variants: Record<string, CSSProperties> = {
    primary: {
      border: "1px solid #0f172a",
      background: "#0f172a",
      color: "#ffffff",
    },
    secondary: {
      border: `1px solid ${LINE}`,
      background: PAPER,
      color: INK,
    },
    outline: {
      border: `1px solid ${LINE}`,
      background: PAPER,
      color: INK,
    },
    danger: {
      border: `1px solid #fca5a5`,
      background: "#fef2f2",
      color: "#b91c1c",
      fontWeight: 500,
    },
    ghost: {
      border: "1px solid transparent",
      background: "transparent",
      color: MUTED,
    },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...base,
        ...variants[variant],
        ...(disabled
          ? {
              background: "#f1f5f9",
              color: "#94a3b8",
              border: `1px solid ${LINE}`,
              cursor: "not-allowed",
            }
          : null),
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function useReasonPrompt() {
  const [state, setState] = useState<{
    title: string;
    description?: string;
    placeholder?: string;
    resolve: (value: string | null) => void;
  } | null>(null);
  const [value, setValue] = useState("");

  const ask = (
    title: string,
    opts?: { description?: string; placeholder?: string; initial?: string },
  ): Promise<string | null> =>
    new Promise((resolve) => {
      setValue(opts?.initial ?? "");
      setState({ title, description: opts?.description, placeholder: opts?.placeholder, resolve });
    });

  const close = (result: string | null) => {
    state?.resolve(result);
    setState(null);
  };

  const element = state ? (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 100,
        backdropFilter: "blur(2px)",
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") close(null);
      }}
    >
      <Card style={{ padding: 24, width: "100%", maxWidth: 440 }}>
        <DisplayTitle size={18} style={{ fontWeight: 600 }}>
          {state.title}
        </DisplayTitle>
        {state.description && (
          <div style={{ fontSize: 13, color: MUTED, marginTop: 6, lineHeight: 1.5 }}>
            {state.description}
          </div>
        )}
        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={state.placeholder}
          style={{
            marginTop: 14,
            width: "100%",
            minHeight: 100,
            border: `1px solid ${LINE}`,
            borderRadius: BUTTON_RADIUS,
            padding: "10px 12px",
            fontSize: 13.5,
            fontFamily: "inherit",
            color: INK,
            boxSizing: "border-box",
            resize: "vertical",
            outline: "none",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && value.trim()) close(value.trim());
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <Button variant="secondary" onClick={() => close(null)}>
            Hủy
          </Button>
          <Button variant="primary" disabled={!value.trim()} onClick={() => close(value.trim())}>
            Xác nhận
          </Button>
        </div>
      </Card>
    </div>
  ) : null;

  return { ask, element };
}


