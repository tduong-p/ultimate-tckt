/** S3 — Sinh viên: nộp hồ sơ theo Clay Design Language.
 *  - Canvas warm putty #f4f3f0, cards paper #fefdfb (24px radius), 1px #dad4c8 border.
 *  - Spreadsheets & checklist enrichment with candy pastel tags. */
import { useEffect, useRef, useState } from "react";
import { Button, Card, DisplayTitle, ScreenTag, useReasonPrompt } from "../../components/ui";
import {
  ApiError,
  createCase,
  listCases,
  markNotApplicable,
  performAction,
  uploadDocumentFile,
  type CaseOut,
  type DocumentOut,
} from "../../lib/api";
import {
  BG_ALT,
  BUTTON_RADIUS,
  CANDY,
  INK,
  LINE,
  MONO,
  MUTED,
  PAPER,
  TONE,
} from "../../theme/tokens";

const docTone = (st: DocumentOut["status"]) =>
  st === "submitted" || st === "accepted"
    ? CANDY.lime
    : st === "rejected"
    ? CANDY.coral
    : st === "not_applicable"
    ? TONE.neutral
    : CANDY.peach;

const docLabel = (st: DocumentOut["status"]) =>
  ({
    submitted: "Đã nộp",
    accepted: "Đã thẩm định đạt",
    rejected: "Cần nộp lại",
    not_applicable: "Không áp dụng",
    not_submitted: "Chưa nộp",
  })[st] ?? st;

export function SubmitCase() {
  const [caseData, setCaseData] = useState<CaseOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const { ask, element: reasonPrompt } = useReasonPrompt();

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const cases = await listCases();
      const draft = cases.find((c) => c.status === "draft" || c.status === "need_supplement");
      if (draft) {
        setCaseData(draft);
      } else if (cases.length > 0) {
        setCaseData(cases[0]);
      } else {
        const created = await createCase("ket_nap");
        setCaseData(created);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tải được hồ sơ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pickFile = (docId: number) => {
    setUploadingId(docId);
    fileInputRef.current?.click();
  };

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || uploadingId === null || !caseData) return;
    setBusy(true);
    setError("");
    try {
      await uploadDocumentFile(uploadingId, file);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tải file thất bại.");
    } finally {
      setBusy(false);
      setUploadingId(null);
    }
  };

  const notApplicable = async (docId: number) => {
    const reason = await ask("Lý do đánh dấu không áp dụng", {
      placeholder: "Nhập lý do...",
    });
    if (reason === null) return;
    setBusy(true);
    setError("");
    try {
      await markNotApplicable(docId, reason);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Thao tác thất bại.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!caseData) return;
    setBusy(true);
    setError("");
    try {
      await performAction(caseData.id, "submit");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gửi hồ sơ thất bại.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", padding: "60px 0", color: MUTED }}>
        Đang chuẩn bị hồ sơ…
      </div>
    );
  }

  if (error && !caseData) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <Card pastel="coral" style={{ padding: 20 }}>
          <div>{error}</div>
          <Button onClick={load} style={{ marginTop: 12 }}>Thử lại</Button>
        </Card>
      </div>
    );
  }

  if (!caseData) return null;

  const docs = caseData.documents;
  const done = docs.filter((d) => d.status === "submitted" || d.status === "accepted" || d.status === "not_applicable").length;
  const missing = docs.filter((d) => d.is_required && (d.status === "not_submitted" || d.status === "rejected")).length;
  const canSubmit = caseData.available_actions.some((a) => a.action_code === "submit");
  const percent = docs.length > 0 ? Math.round((done / docs.length) * 100) : 0;

  return (
    <div style={{ maxWidth: 540, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {reasonPrompt}
      <div>
        <ScreenTag>S3 · Nộp hồ sơ</ScreenTag>
        <DisplayTitle size={36} style={{ marginTop: 6 }}>
          Hoàn thiện giấy tờ
        </DisplayTitle>
        <div style={{ fontSize: 13.5, color: MUTED, marginTop: 4 }}>
          Mã hồ sơ: <span style={{ fontFamily: MONO, color: INK }}>{caseData.code}</span> · {caseData.case_type === "ket_nap" ? "Kết nạp Đảng" : "Chuyển chính thức"}
        </div>
      </div>

      <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={onFileChosen} />

      <Card style={{ padding: "26px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>Danh mục tài liệu</div>
            <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>
              Đã hoàn tất {done}/{docs.length} đầu mục
            </div>
          </div>

          <div style={{ width: 100 }}>
            <div style={{ height: 6, borderRadius: 999, background: BG_ALT, border: `1px solid ${LINE}`, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${percent}%`,
                  background: percent === 100 ? CANDY.lime.fg : CANDY.blue.fg,
                  borderRadius: 999,
                  transition: "width 200ms ease",
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          {docs.map((doc) => {
            const tone = docTone(doc.status);
            return (
              <div
                key={doc.id}
                style={{
                  border: `1px solid ${LINE}`,
                  borderRadius: BUTTON_RADIUS,
                  padding: "14px 16px",
                  background: PAPER,
                  transition: "background 100ms ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: INK }}>{doc.name}</div>
                    {doc.filename && (
                      <div style={{ fontSize: 12, color: MUTED, fontFamily: MONO, marginTop: 2 }}>
                        {doc.filename}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      flexShrink: 0,
                      fontSize: 11.5,
                      fontWeight: 500,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: tone.bg,
                      color: tone.fg,
                      border: `1px solid ${tone.border}`,
                    }}
                  >
                    {docLabel(doc.status)}
                  </div>
                </div>

                {doc.status === "rejected" && doc.reason && (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 12.5,
                      background: CANDY.coral.bg,
                      color: CANDY.coral.fg,
                      border: `1px solid ${CANDY.coral.border}`,
                      borderRadius: 8,
                      padding: "8px 12px",
                      lineHeight: 1.45,
                    }}
                  >
                    <b>Cần sửa:</b> {doc.reason}
                  </div>
                )}

                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <Button
                    variant={doc.status === "submitted" || doc.status === "accepted" ? "secondary" : "primary"}
                    disabled={busy}
                    onClick={() => pickFile(doc.id)}
                    style={{
                      padding: "7px 14px",
                      fontSize: 12.5,
                      borderRadius: BUTTON_RADIUS,
                    }}
                  >
                    {doc.status === "submitted" || doc.status === "accepted" ? "Tải lại tệp khác" : "Chọn tệp tải lên"}
                  </Button>

                  {doc.allow_not_applicable && doc.status !== "not_applicable" && (
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => notApplicable(doc.id)}
                      style={{ padding: "7px 12px", fontSize: 12.5 }}
                    >
                      Không áp dụng
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {missing > 0 && (
          <div
            style={{
              marginTop: 18,
              background: CANDY.peach.bg,
              color: CANDY.peach.fg,
              border: `1px solid ${CANDY.peach.border}`,
              borderRadius: BUTTON_RADIUS,
              padding: "12px 16px",
              fontSize: 13,
            }}
          >
            Còn thiếu <b>{missing}</b> giấy tờ bắt buộc để có thể gửi hồ sơ lên Đoàn trường/LCĐ.
          </div>
        )}
      </Card>

      {error && (
        <Card pastel="coral" style={{ padding: 14 }}>
          {error}
        </Card>
      )}

      <div style={{ position: "sticky", bottom: 16 }}>
        <Button
          disabled={!canSubmit || busy}
          variant="primary"
          onClick={submit}
          style={{
            width: "100%",
            padding: "14px 20px",
            fontSize: 14.5,
            borderRadius: BUTTON_RADIUS,
          }}
        >
          {busy ? "Đang gửi hồ sơ…" : "Gửi hồ sơ xét duyệt"}
        </Button>
      </div>
    </div>
  );
}

