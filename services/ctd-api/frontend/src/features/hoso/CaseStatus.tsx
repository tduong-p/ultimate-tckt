/** S2 — Sinh viên: hồ sơ của tôi đang ở đâu (Clay Design Language · mobile-first).
 *  - Canvas warm putty #f4f3f0, cards paper #fefdfb (24px radius), 1px #dad4c8 border.
 *  - Candy-pastel action block with deep same-hue text. */
import { useEffect, useState } from "react";
import { Button, Card, DisplayTitle, Pill, ScreenTag, SectionLabel } from "../../components/ui";
import { ApiError, caseEvents, listCases, performAction, type CaseEventOut, type CaseOut } from "../../lib/api";
import {
  BUTTON_RADIUS,
  CANDY,
  INK,
  LINE,
  LINE_SOFT,
  MONO,
  MUTED,
  PAPER,
} from "../../theme/tokens";

const NEEDS_ATTENTION = new Set(["need_supplement"]);

function formatDate(iso: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

export function CaseStatus() {
  const [cases, setCases] = useState<CaseOut[] | null>(null);
  const [events, setEvents] = useState<CaseEventOut[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const list = await listCases();
      setCases(list);
      if (list.length > 0) setEvents(await caseEvents(list[0].id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tải được hồ sơ.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (error) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <Card pastel="coral" style={{ padding: 20 }}>
          <div style={{ fontWeight: 500 }}>{error}</div>
          <Button onClick={load} style={{ marginTop: 12 }}>Thử lại</Button>
        </Card>
      </div>
    );
  }

  if (cases === null) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", padding: "60px 0", color: MUTED }}>
        Đang tải thông tin hồ sơ của bạn…
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <ScreenTag>S2 · Sinh viên</ScreenTag>
        <Card style={{ padding: "32px 28px", marginTop: 16 }}>
          <DisplayTitle size={32}>Chưa có hồ sơ</DisplayTitle>
          <div style={{ fontSize: 14, color: MUTED, marginTop: 8 }}>
            Bạn hiện tại chưa tạo hồ sơ Đảng nào trong đợt này. Chuyển sang tab &ldquo;Nộp hồ sơ&rdquo; để bắt đầu nộp các văn bản giấy tờ cần thiết.
          </div>
        </Card>
      </div>
    );
  }

  const c = cases[0];
  const canAct = c.available_actions.filter((a) => a.action_code !== "submit");
  const warn = NEEDS_ATTENTION.has(c.status);

  const doAction = async (actionCode: string) => {
    setBusy(true);
    setError("");
    try {
      await performAction(c.id, actionCode);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Thao tác thất bại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <ScreenTag>S2 · Sinh viên · Mobile-First</ScreenTag>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
          Theo dõi hành trình xét duyệt hồ sơ Đảng của bạn
        </div>
      </div>

      {/* Main Status Paper Card */}
      <Card style={{ overflow: "hidden" }}>
        <div style={{ padding: "24px 26px 20px", borderBottom: `1px solid ${LINE}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12.5, color: MUTED, fontFamily: MONO }}>
              {c.code}
            </span>
            <span style={{ fontSize: 12.5, color: MUTED }}>
              {c.case_type === "ket_nap" ? "Kết nạp Đảng" : "Chuyển chính thức"}
            </span>
          </div>

          <DisplayTitle size={34} style={{ marginTop: 10 }}>
            {c.applicant_name}
          </DisplayTitle>

          <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Pill tone={warn ? "warn" : "info"}>{c.status_label}</Pill>
            <span style={{ fontSize: 12.5, color: MUTED }}>
              Ở trạng thái này <b>{c.days_in_status} ngày</b>
            </span>
          </div>
        </div>

        {/* Signature Candy Pastel Card for Action Required */}
        {canAct.length > 0 && (
          <div
            style={{
              background: CANDY.peach.bg,
              color: CANDY.peach.fg,
              padding: "20px 26px",
              borderBottom: `1px solid ${CANDY.peach.border}`,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>
              VIỆC CẦN LÀM NGAY
            </div>
            <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.5 }}>
              Hồ sơ đang chờ {c.status_label.toLowerCase()}. Vui lòng kiểm tra và xử lý các yêu cầu bổ sung để tiến độ không bị gián đoạn.
            </div>

            {canAct.map((a) => (
              <Button
                key={a.action_code}
                variant="primary"
                disabled={busy}
                onClick={() => doAction(a.action_code)}
                style={{
                  marginTop: 16,
                  width: "100%",
                  padding: "12px 18px",
                  fontSize: 14,
                  borderRadius: BUTTON_RADIUS,
                }}
              >
                {busy ? "Đang xử lý…" : a.label}
              </Button>
            ))}
          </div>
        )}

        <div style={{ padding: "20px 26px", background: PAPER }}>
          <SectionLabel>Chi tiết trạng thái hiện tại</SectionLabel>
          <div style={{ marginTop: 8, fontSize: 13.5, color: INK, lineHeight: 1.5 }}>
            Hồ sơ của bạn đang được <b>{c.status_label}</b>, bắt đầu từ ngày <b>{formatDate(c.state_entered_at)}</b>.
          </div>
        </div>
      </Card>

      {/* Timeline Card */}
      <Card style={{ padding: "24px 26px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SectionLabel>Nhật ký xử lý hồ sơ</SectionLabel>
          <span style={{ fontSize: 12, color: MUTED, fontFamily: MONO }}>{events.length} mốc</span>
        </div>

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          {events.length === 0 && (
            <div style={{ fontSize: 13, color: MUTED }}>Chưa có sự kiện nào được ghi nhận.</div>
          )}
          {[...events].reverse().map((h, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "84px 1fr",
                gap: 14,
                fontSize: 13,
                paddingBottom: i < events.length - 1 ? 14 : 0,
                borderBottom: i < events.length - 1 ? `1px solid ${LINE_SOFT}` : "none",
              }}
            >
              <div style={{ color: MUTED, fontFamily: MONO, fontSize: 12 }}>
                {formatDate(h.created_at)}
              </div>
              <div>
                <div style={{ fontWeight: 500, color: INK }}>{h.action_label}</div>
                <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{h.actor_name}</div>
                {h.reason && (
                  <div
                    style={{
                      background: CANDY.coral.bg,
                      color: CANDY.coral.fg,
                      border: `1px solid ${CANDY.coral.border}`,
                      borderRadius: 8,
                      padding: "8px 12px",
                      marginTop: 8,
                      fontSize: 12.5,
                      lineHeight: 1.45,
                    }}
                  >
                    {h.reason}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
