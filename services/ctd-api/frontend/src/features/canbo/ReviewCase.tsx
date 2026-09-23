/** C2 — Cán bộ: kiểm tra hồ sơ theo Clay Design Language.
 *  - Canvas warm putty #f4f3f0, cards paper #fefdfb (24px radius), 1px #dad4c8 border.
 *  - Display typography: huge tightly tracked applicant header.
 *  - Candy-pastel verdict actions (Lime #eef773, Coral #fcbabe) with deep same-hue text.
 *  - Solid black primary workflow actions. */
import { useEffect, useState } from "react";
import { Button, Card, DisplayTitle, Pill, ScreenTag, SectionLabel, useReasonPrompt } from "../../components/ui";
import {
  ApiError,
  caseEvents,
  documentUrl,
  getCase,
  markVerdict,
  performAction,
  type ActionOut,
  type CaseEventOut,
  type CaseOut,
  type DocumentOut,
} from "../../lib/api";
import {
  BG_ALT,
  BUTTON_RADIUS,
  CANDY,
  INK,
  LINE,
  LINE_SOFT,
  MONO,
  MUTED,
  NAVY,
  PAPER,
  TONE,
  WHITE,
  type Tone,
} from "../../theme/tokens";


function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const docTone = (st: DocumentOut["status"]): Tone => {
  switch (st) {
    case "accepted":
      return "ok";
    case "rejected":
      return "danger";
    case "submitted":
      return "info";
    case "not_applicable":
      return "neutral";
    case "not_submitted":
    default:
      return "warn";
  }
};

const docLabel = (st: DocumentOut["status"]): string => {
  switch (st) {
    case "accepted":
      return "Đạt";
    case "rejected":
      return "Không đạt";
    case "submitted":
      return "Đã nộp";
    case "not_applicable":
      return "Không áp dụng";
    case "not_submitted":
    default:
      return "Chưa nộp";
  }
};

const docIcon = (st: DocumentOut["status"]): string => {
  switch (st) {
    case "accepted":
      return "✓";
    case "rejected":
      return "✕";
    case "not_applicable":
      return "o";
    case "not_submitted":
      return "-";
    case "submitted":
    default:
      return "•";
  }
};

export function ReviewCase({ caseId, onBack }: { caseId: number; onBack: () => void }) {
  const [caseData, setCaseData] = useState<CaseOut | null>(null);
  const [events, setEvents] = useState<CaseEventOut[]>([]);
  const [docIdx, setDocIdx] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [returnReason, setReturnReason] = useState<string>("");
  const { ask, element: reasonPrompt } = useReasonPrompt();

  const loadData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setError("");
    try {
      const [c, evts] = await Promise.all([getCase(caseId), caseEvents(caseId)]);
      setCaseData(c);
      setEvents(evts);

      // Tự động gom lý do từ các giấy tờ không đạt
      const rejectedDocs = c.documents.filter((d) => d.status === "rejected" && d.reason);
      if (rejectedDocs.length > 0) {
        setReturnReason(
          rejectedDocs.map((d, i) => `${i + 1}. ${d.name}: ${d.reason}`).join("\n")
        );
      } else if (isInitial) {
        setReturnReason("");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được thông tin hồ sơ.");
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, [caseId]);

  const docs = caseData?.documents ?? [];
  const safeDocIdx = docs.length > 0 ? Math.min(Math.max(0, docIdx), docs.length - 1) : 0;
  const currentDoc = docs[safeDocIdx] ?? null;

  const failedDocs = docs.filter((d) => d.status === "rejected");
  const hasRejected = failedDocs.length > 0;

  // Mở xem / Tải tài liệu
  const handleViewDoc = async () => {
    if (!currentDoc || !currentDoc.filename) return;
    setDownloading(true);
    setError("");
    try {
      const res = await documentUrl(currentDoc.id);
      if (res.url) {
        window.open(res.url, "_blank");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không lấy được liên kết tài liệu.");
    } finally {
      setDownloading(false);
    }
  };

  // Đánh dấu "Đạt"
  const handlePass = async () => {
    if (!currentDoc) return;
    setBusy(true);
    setError("");
    try {
      await markVerdict(currentDoc.id, "accepted");
      await loadData(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Đánh giá đạt thất bại.");
    } finally {
      setBusy(false);
    }
  };

  // Đánh dấu "Không đạt"
  const handleFail = async () => {
    if (!currentDoc) return;
    const reason = await ask(`Lý do không đạt`, {
      description: `Giấy tờ: "${currentDoc.name}"`,
      placeholder: "Nhập lý do để sinh viên biết cần bổ sung...",
      initial: currentDoc.reason || "",
    });
    if (reason === null) return;
    setBusy(true);
    setError("");
    try {
      await markVerdict(currentDoc.id, "rejected", reason);
      await loadData(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Đánh giá không đạt thất bại.");
    } finally {
      setBusy(false);
    }
  };

  // Thực hiện hành động hồ sơ
  const handleAction = async (a: ActionOut) => {
    let reasonToSend = returnReason.trim();

    if (a.requires_reason && !reasonToSend) {
      const reason = await ask(`Lý do bắt buộc`, {
        description: `Hành động "${a.label}" yêu cầu nhập lý do.`,
        placeholder: "Nhập lý do...",
      });
      if (reason === null) return;
      reasonToSend = reason;
      setReturnReason(reasonToSend);
    }

    setBusy(true);
    setError("");
    try {
      await performAction(caseId, a.action_code, reasonToSend);
      await loadData(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Thực hiện hành động thất bại.");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !caseData) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <ScreenTag>C2 · Kiểm tra hồ sơ</ScreenTag>
          <Button onClick={onBack}>← Hộp xử lý</Button>
        </div>
        <Card style={{ padding: 32, textAlign: "center", color: MUTED }}>
          Đang tải dữ liệu hồ sơ #{caseId}…
        </Card>
      </div>
    );
  }

  if (error && !caseData) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <ScreenTag>C2 · Kiểm tra hồ sơ</ScreenTag>
          <Button onClick={onBack}>← Hộp xử lý</Button>
        </div>
        <Card style={{ padding: 24, background: TONE.danger.bg, border: `1px solid ${CANDY.coral.border}`, color: TONE.danger.fg }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Đã xảy ra lỗi</div>
          <div style={{ fontSize: 13.5, marginTop: 4 }}>{error}</div>
          <Button onClick={() => loadData(true)} style={{ marginTop: 12 }}>Thử lại</Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {reasonPrompt}
      {/* Tiêu đề & Điều hướng */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
        <div>
          <ScreenTag>C2 · Thẩm định hồ sơ cán bộ</ScreenTag>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
            <DisplayTitle size={26}>
              {caseData ? caseData.applicant_name : `Hồ sơ #${caseId}`}
            </DisplayTitle>
            {caseData && (
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 13,
                  fontWeight: 600,
                  color: INK,
                  background: "#f1f5f9",
                  border: `1px solid ${LINE}`,
                  borderRadius: 6,
                  padding: "2px 8px",
                }}
              >
                {caseData.code}
              </span>
            )}
          </div>
          {caseData && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, color: MUTED, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 500, color: INK }}>{caseData.unit_name}</span>
              <span>·</span>
              <span>{caseData.case_type === "ket_nap" ? "Kết nạp Đảng" : "Chuyển chính thức"}</span>
              <span>·</span>
              <Pill tone={docTone(caseData.status as any)}>{caseData.status_label}</Pill>
              <span>·</span>
              <span>Ở trạng thái: <b>{caseData.days_in_status} ngày</b></span>
            </div>
          )}
        </div>
        <Button variant="secondary" onClick={onBack} style={{ padding: "10px 18px" }}>
          ← Quay lại hộp xử lý
        </Button>
      </div>

      {/* Thông báo lỗi thao tác nếu có */}
      {error && (
        <div
          style={{
            background: TONE.danger.bg,
            color: TONE.danger.fg,
            border: `1px solid ${CANDY.coral.border}`,
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            style={{ background: "transparent", border: 0, color: TONE.danger.fg, cursor: "pointer", fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Bố cục 2 cột */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 16, alignItems: "start" }}>
        {/* CỘT TRÁI: Trình xem tài liệu & Đánh giá */}
        <Card style={{ overflow: "hidden" }}>
          {/* Thanh tiêu đề giấy tờ */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "12px 16px",
              borderBottom: `1px solid ${LINE}`,
              background: WHITE,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentDoc ? currentDoc.name : "Không có giấy tờ"}
              </div>
              {currentDoc && (
                <Pill tone={docTone(currentDoc.status)}>
                  {docLabel(currentDoc.status)}
                </Pill>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5, color: MUTED, flexShrink: 0 }}>
              <Button
                onClick={() => setDocIdx((i) => Math.max(0, i - 1))}
                disabled={safeDocIdx === 0}
                style={{ borderRadius: 6, padding: "5px 10px" }}
              >
                ←
              </Button>
              <span style={{ fontFamily: MONO }}>
                {docs.length > 0 ? `${safeDocIdx + 1} / ${docs.length}` : "0 / 0"}
              </span>
              <Button
                onClick={() => setDocIdx((i) => Math.min(docs.length - 1, i + 1))}
                disabled={safeDocIdx >= docs.length - 1}
                style={{ borderRadius: 6, padding: "5px 10px" }}
              >
                →
              </Button>
            </div>
          </div>

          {/* Vùng xem nội dung file */}
          <div
            style={{
              minHeight: 440,
              background: BG_ALT,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              gap: 16,
            }}
          >
            {currentDoc ? (
              currentDoc.filename ? (
                <>
                  <div
                    style={{
                      background: WHITE,
                      border: `1px solid ${LINE}`,
                      borderRadius: 10,
                      padding: "24px 28px",
                      maxWidth: 420,
                      width: "100%",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 40, marginBottom: 10 }}>📄</div>
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 13,
                        fontWeight: 600,
                        color: INK,
                        wordBreak: "break-all",
                        marginBottom: 4,
                      }}
                    >
                      {currentDoc.filename}
                    </div>
                    <div style={{ fontSize: 12, color: MUTED, marginBottom: 18 }}>
                      Đã đính kèm bởi sinh viên
                    </div>
                    <Button
                      disabled={downloading}
                      onClick={handleViewDoc}
                      style={{
                        border: `1px solid ${NAVY}`,
                        color: NAVY,
                        background: WHITE,
                        padding: "10px 18px",
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      {downloading ? "Đang tạo liên kết…" : "Mở xem / Tải tài liệu ↗"}
                    </Button>
                  </div>

                  {currentDoc.status === "rejected" && currentDoc.reason && (
                    <div
                      style={{
                        maxWidth: 420,
                        width: "100%",
                        background: TONE.danger.bg,
                        border: `1px solid ${CANDY.coral.border}`,
                        borderRadius: 8,
                        padding: "12px 14px",
                        fontSize: 13,
                        color: TONE.danger.fg,
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Lý do không đạt hiện tại:</div>
                      <div>{currentDoc.reason}</div>
                    </div>
                  )}
                </>
              ) : (
                <div
                  style={{
                    background: WHITE,
                    border: `1px dashed ${LINE}`,
                    borderRadius: 10,
                    padding: "28px 32px",
                    maxWidth: 400,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.7 }}>📁</div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: INK, marginBottom: 6 }}>
                    Sinh viên chưa nộp tệp cho mục này
                  </div>
                  <div style={{ fontSize: 12.5, color: MUTED }}>
                    {currentDoc.is_required
                      ? "Mục này là giấy tờ bắt buộc theo quy định hồ sơ."
                      : currentDoc.allow_not_applicable
                      ? "Mục này có thể đánh dấu không áp dụng nếu đối tượng không thuộc diện."
                      : "Chưa có tài liệu đính kèm."}
                  </div>
                </div>
              )
            ) : (
              <div style={{ color: MUTED, fontSize: 13 }}>Không tìm thấy giấy tờ.</div>
            )}
          </div>

          {/* Hai nút đánh giá giấy tờ */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "16px 20px",
              borderTop: `1px solid ${LINE}`,
              background: PAPER,
              flexWrap: "wrap",
            }}
          >
            <Button
              disabled={busy || !currentDoc}
              onClick={handlePass}
              style={{
                border: `1px solid ${CANDY.lime.border}`,
                color: currentDoc?.status === "accepted" ? PAPER : CANDY.lime.fg,
                background: currentDoc?.status === "accepted" ? CANDY.lime.fg : CANDY.lime.bg,
                padding: "10px 20px",
                fontWeight: 500,
                borderRadius: BUTTON_RADIUS,
              }}
            >
              {currentDoc?.status === "accepted" ? "✓ Đã thẩm định Đạt" : "Đánh giá: Đạt"}
            </Button>
            <Button
              disabled={busy || !currentDoc}
              onClick={handleFail}
              style={{
                border: `1px solid ${CANDY.coral.border}`,
                color: currentDoc?.status === "rejected" ? PAPER : CANDY.coral.fg,
                background: currentDoc?.status === "rejected" ? CANDY.coral.fg : CANDY.coral.bg,
                padding: "10px 20px",
                fontWeight: 500,
                borderRadius: BUTTON_RADIUS,
              }}
            >
              {currentDoc?.status === "rejected" ? "✕ Sửa lý do không đạt" : "Không đạt + Ghi lý do"}
            </Button>
            {currentDoc?.status === "not_applicable" && (
              <span style={{ fontSize: 12.5, color: MUTED, marginLeft: "auto" }}>
                Giấy tờ đang đánh dấu Không áp dụng
              </span>
            )}
          </div>
        </Card>

        {/* CỘT PHẢI: Checklist & Thao tác */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Checklist giấy tờ */}
          <Card style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <SectionLabel>Checklist giấy tờ</SectionLabel>
              <span style={{ fontSize: 12, color: MUTED, fontFamily: MONO }}>
                {docs.filter((d) => d.status === "accepted").length} / {docs.length} đạt
              </span>
            </div>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {docs.map((doc, idx) => {
                const isSel = idx === safeDocIdx;
                const tone = docTone(doc.status);
                const icon = docIcon(doc.status);

                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setDocIdx(idx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      textAlign: "left",
                      border: `1px solid ${isSel ? INK : LINE_SOFT}`,
                      background: isSel ? "#f6f3eb" : WHITE,
                      borderRadius: 8,
                      padding: "10px 12px",
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        flex: "0 0 20px",
                        borderRadius: "50%",
                        background:
                          doc.status === "accepted"
                            ? TONE.ok.fg
                            : doc.status === "rejected"
                            ? TONE.danger.fg
                            : doc.status === "not_applicable"
                            ? MUTED
                            : LINE,
                        color: doc.status === "not_submitted" ? MUTED : WHITE,
                        fontSize: 11,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                      }}
                    >
                      {icon}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13.5,
                        color: INK,
                        fontWeight: isSel ? 600 : 400,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {doc.name}
                    </span>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 999,
                        background: TONE[tone].bg,
                        color: TONE[tone].fg,
                        flex: "0 0 auto",
                      }}
                    >
                      {docLabel(doc.status)}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Lý do trả về & Hành động xử lý hồ sơ */}
          <Card style={{ padding: 16 }}>
            <SectionLabel>Lý do trả về (tự gom)</SectionLabel>
            <textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder={
                hasRejected
                  ? "Lý do được tự động gom từ các mục không đạt..."
                  : "Chưa có mục nào bị đánh dấu không đạt. Cán bộ có thể nhập lý do/ghi chú bổ sung tại đây."
              }
              style={{
                marginTop: 10,
                border: `1px solid ${LINE}`,
                borderRadius: BUTTON_RADIUS,
                background: BG_ALT,
                padding: "12px 14px",
                fontSize: 13.5,
                minHeight: 88,
                color: INK,
                width: "100%",
                boxSizing: "border-box",
                fontFamily: "inherit",
                resize: "vertical",
                outline: "none",
              }}
            />

            <div style={{ marginTop: 20 }}>
              <SectionLabel>Hành động xử lý hồ sơ</SectionLabel>
              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                {caseData && caseData.available_actions.length > 0 ? (
                  caseData.available_actions.map((a) => {
                    const isApproval = !a.requires_reason;
                    const isCancel = a.action_code === "cancel";
                    const isDisabled = busy || (hasRejected && isApproval);

                    let variant: "primary" | "secondary" | "danger" = "secondary";
                    if (isApproval) variant = "primary";
                    else if (a.requires_reason) variant = "danger";
                    else if (isCancel) variant = "secondary";

                    return (
                      <Button
                        key={a.action_code}
                        variant={variant}
                        disabled={isDisabled}
                        onClick={() => handleAction(a)}
                        style={{
                          flex: "1 1 calc(50% - 5px)",
                          minWidth: 140,
                          padding: "12px 16px",
                          fontSize: 13.5,
                          borderRadius: BUTTON_RADIUS,
                        }}
                      >
                        {busy ? "Đang gửi…" : a.label}
                      </Button>
                    );
                  })
                ) : (
                  <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
                    Không có hành động khả dụng ở trạng thái này.
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
              {hasRejected ? (
                <span style={{ color: TONE.danger.fg }}>
                  Còn {failedDocs.length} mục không đạt — hành động thông qua bị khoá. Vui lòng gửi yêu cầu bổ sung kèm lý do.
                </span>
              ) : (
                <span>
                  Nút tiếp nhận/thông qua sẽ khoá khi còn mục không đạt — buộc phải trả về kèm lý do theo quy định.
                </span>
              )}
            </div>
          </Card>

          {/* Lịch sử xử lý / Dòng thời gian */}
          <Card style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <SectionLabel>Lịch sử xử lý</SectionLabel>
              <span style={{ fontSize: 12, color: MUTED }}>{events.length} sự kiện</span>
            </div>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>
              {events.length === 0 ? (
                <div style={{ fontSize: 13, color: MUTED }}>Chưa có sự kiện nào.</div>
              ) : (
                [...events].reverse().map((ev, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "110px 1fr",
                      gap: 12,
                      fontSize: 13,
                      paddingBottom: i !== events.length - 1 ? 12 : 0,
                      borderBottom: i !== events.length - 1 ? `1px solid ${LINE_SOFT}` : "none",
                    }}
                  >
                    <div style={{ color: MUTED, fontFamily: MONO, fontSize: 11.5 }}>
                      {formatDate(ev.created_at)}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, color: INK }}>{ev.action_label}</span>
                        {ev.to_status_label && (
                          <span
                            style={{
                              fontSize: 11,
                              padding: "2px 7px",
                              borderRadius: 4,
                              background: BG_ALT,
                              border: `1px solid ${LINE}`,
                              color: MUTED,
                            }}
                          >
                            → {ev.to_status_label}
                          </span>
                        )}
                      </div>
                      <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>
                        {ev.actor_name ? `Người thực hiện: ${ev.actor_name}` : "Hệ thống"}
                      </div>
                      {ev.reason && (
                        <div
                          style={{
                            color: CANDY.blue.fg,
                            background: CANDY.blue.bg,
                            padding: "6px 10px",
                            borderRadius: 6,
                            marginTop: 5,
                            fontSize: 12.5,
                            wordBreak: "break-word",
                          }}
                        >
                          {ev.reason}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
