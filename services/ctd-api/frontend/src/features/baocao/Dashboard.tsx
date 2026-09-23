/** C6 — VP Đoàn & Ban TCKT: Toàn cảnh đợt xét theo Clay Design Language.
 *  - Canvas warm putty #f4f3f0, cards paper #fefdfb (24px radius), 1px #dad4c8 border.
 *  - 4 signature candy-pastel metric cards with deep same-hue text.
 *  - Dense spreadsheet motif & progress meters for backlog tracking. */
import { useState } from "react";
import { Button, Card, DisplayTitle, KpiCard, Pill, ScreenTag, SectionLabel } from "../../components/ui";
import { BACKLOG, KPIS, STATUS_BARS } from "../../data/mock";
import {
  BG_ALT,
  BUTTON_RADIUS,
  CANDY,
  INK,
  LINE,
  LINE_SOFT,
  MONO,
  MUTED,
  PAPER,
} from "../../theme/tokens";

// Signature status colors for stage distribution
const BAR_COLORS: Record<string, { bar: string; labelTone: string }> = {
  "Chờ LCĐ kiểm tra": { bar: "#93c5fd", labelTone: "info" },
  "Đủ điều kiện họp xét": { bar: "#86efac", labelTone: "ok" },
  "Chờ Ban TCKT": { bar: "#cbd5e1", labelTone: "neutral" },
  "Đã chuyển Chi bộ": { bar: "#4ade80", labelTone: "ok" },
  "Không thông qua": { bar: "#fca5a5", labelTone: "danger" },
};

export function Dashboard() {
  const [copied, setCopied] = useState(false);
  const max = Math.max(...STATUS_BARS.map((b) => b.value));

  const handleExport = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <ScreenTag>C6 · VP Đoàn &amp; Ban TCKT</ScreenTag>
          <DisplayTitle size={26} style={{ marginTop: 6 }}>
            Toàn cảnh đợt xét 2026-2
          </DisplayTitle>
          <div style={{ fontSize: 13.5, color: MUTED, marginTop: 4 }}>
            Giám sát thời gian thực tiến độ xét nạp &amp; chuyển chính thức · Trả lời câu hỏi tồn bao nhiêu, tồn ở đâu
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Button variant="secondary">
            In báo cáo
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
          >
            {copied ? "Đã xuất file Excel ✓" : "Xuất báo cáo tổng hợp"}
          </Button>
        </div>
      </div>

      {/* 4 Bento KPI Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <KpiCard
          icon="👥"
          label="Tổng hồ sơ đợt xét"
          value={KPIS[0].value}
          delta="+12%"
          deltaPositive={true}
        />
        <KpiCard
          icon="⏳"
          label="Đang chờ xử lý"
          value={KPIS[1].value}
          delta="+4%"
          deltaPositive={false}
        />
        <KpiCard
          icon="⚠️"
          label="Quá hạn 7 ngày (SLA)"
          value={KPIS[2].value}
          delta="-2"
          deltaPositive={true}
        />
        <KpiCard
          icon="⚡"
          label="Thời gian xử lý trung bình"
          value={`${KPIS[3].value} ngày`}
          delta="Đạt chỉ tiêu"
          deltaPositive={true}
        />
      </div>


      {/* Detail Section: Status Distribution & Longest Backlog */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Left: Distribution by status */}
        <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <SectionLabel>Phân bổ tiến độ</SectionLabel>
              <div style={{ fontSize: 17, fontWeight: 600, marginTop: 2 }}>
                Hồ sơ theo trạng thái
              </div>
            </div>
            <span style={{ fontSize: 12, color: MUTED, fontFamily: MONO }}>184 hồ sơ</span>
          </div>

          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            {STATUS_BARS.map((b) => {
              const info = BAR_COLORS[b.label] || { bar: CANDY.blue.bg };
              const pct = Math.round((b.value / max) * 100);
              return (
                <div key={b.label}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13.5,
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{b.label}</span>
                    <span style={{ color: MUTED, fontFamily: MONO, fontWeight: 500 }}>
                      {b.value} <span style={{ fontSize: 11, color: MUTED }}>({Math.round((b.value / 184) * 100)}%)</span>
                    </span>
                  </div>
                  <div
                    style={{
                      height: 10,
                      borderRadius: 999,
                      background: LINE_SOFT,
                      overflow: "hidden",
                      border: `1px solid ${LINE}`,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 999,
                        width: `${pct}%`,
                        background: info.bar,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Right: Longest Backlog / SLA Warning */}
        <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <SectionLabel>Giám sát ách tắc</SectionLabel>
              <div style={{ fontSize: 17, fontWeight: 600, marginTop: 2 }}>
                Hồ sơ tồn đọng lâu nhất
              </div>
            </div>
            <Pill tone="danger" style={{ fontSize: 11 }}>Cần đôn đốc</Pill>
          </div>

          <div
            style={{
              marginTop: 18,
              border: `1px solid ${LINE}`,
              borderRadius: BUTTON_RADIUS,
              overflow: "hidden",
              background: PAPER,
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
                textAlign: "left",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: BG_ALT,
                    borderBottom: `1px solid ${LINE}`,
                    color: MUTED,
                    fontSize: 11.5,
                    letterSpacing: ".04em",
                    textTransform: "uppercase",
                  }}
                >
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Sinh viên</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Khâu xử lý</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>Tồn</th>
                </tr>
              </thead>
              <tbody>
                {BACKLOG.map((b, idx) => (
                  <tr
                    key={b.name}
                    style={{
                      borderBottom: idx === BACKLOG.length - 1 ? "none" : `1px solid ${LINE_SOFT}`,
                    }}
                  >
                    <td style={{ padding: "11px 14px", fontWeight: 500, color: INK }}>
                      {b.name}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span
                        style={{
                          fontSize: 12,
                          color: MUTED,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: b.days > 7 ? CANDY.coral.fg : CANDY.peach.fg,
                          }}
                        />
                        {b.at}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "11px 14px",
                        textAlign: "right",
                        fontFamily: MONO,
                        fontWeight: 600,
                      }}
                    >
                      {b.days > 7 ? (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: CANDY.coral.bg,
                            color: CANDY.coral.fg,
                            border: `1px solid ${CANDY.coral.border}`,
                            fontSize: 12,
                          }}
                        >
                          {b.days} ngày
                        </span>
                      ) : (
                        <span style={{ color: MUTED, fontSize: 12.5 }}>
                          {b.days} ngày
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
