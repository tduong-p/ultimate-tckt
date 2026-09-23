/** C1 — Cán bộ: Hộp xử lý hồ sơ (Modern Enterprise B2B SaaS)
 *  Khớp 1:1 theo ảnh mẫu tham chiếu: 4 thẻ KPI, thanh công cụ tìm kiếm/lọc,
 *  bảng dữ liệu mật độ cao có avatar tròn, mã gạch chân, pill bo tròn capsule và phân trang.
 */
import { useEffect, useMemo, useState } from "react";
import { Avatar, Button, KpiCard, Pill, SearchInput } from "../../components/ui";
import { ApiError, listCases, type CaseOut } from "../../lib/api";
import {
  INK,
  LINE,
  LINE_SOFT,
  MONO,
  MUTED,
  PAPER,
  SLA_WARN_DAYS,
  type Tone,
} from "../../theme/tokens";

type FilterKey = "all" | "dt_checking" | "checking" | "need_supplement" | "eligible" | "forwarded";

interface FilterDef {
  key: FilterKey;
  label: string;
  match: (c: CaseOut) => boolean;
}

const FILTER_DEFS: FilterDef[] = [
  { key: "all", label: "Tất cả hồ sơ", match: () => true },
  {
    key: "dt_checking",
    label: "Chờ tiếp nhận",
    match: (c) => c.status === "dt_checking" || c.status === "draft",
  },
  {
    key: "checking",
    label: "Đang kiểm tra",
    match: (c) => ["dt_checking", "tckt_checking", "vp_checking"].includes(c.status),
  },
  {
    key: "need_supplement",
    label: "Cần bổ sung",
    match: (c) => c.status === "need_supplement",
  },
  {
    key: "eligible",
    label: "Đủ điều kiện",
    match: (c) => ["eligible", "meeting_scheduled"].includes(c.status),
  },
  {
    key: "forwarded",
    label: "Hoàn tất",
    match: (c) => c.status === "forwarded",
  },
];

function statusTone(status: string): Tone {
  switch (status) {
    case "forwarded":
    case "eligible":
      return "ok";
    case "need_supplement":
      return "warn";
    case "dt_checking":
    case "tckt_checking":
    case "vp_checking":
    case "meeting_scheduled":
      return "info";
    case "cancelled":
    case "rejected":
      return "danger";
    case "draft":
    default:
      return "neutral";
  }
}

export function Inbox({ onOpenCase }: { onOpenCase: (id: number) => void }) {
  const [cases, setCases] = useState<CaseOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const loadCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCases();
      setCases(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể tải danh sách hồ sơ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const filteredCases = useMemo(() => {
    const q = search.trim().toLowerCase();
    const currentFilterDef = FILTER_DEFS.find((f) => f.key === filter) ?? FILTER_DEFS[0];

    return cases.filter((c) => {
      const matchesFilter = currentFilterDef.match(c);
      if (!matchesFilter) return false;
      if (!q) return true;
      const matchCode = (c.code ?? "").toLowerCase().includes(q);
      const matchName = (c.applicant_name ?? "").toLowerCase().includes(q);
      const matchUnit = (c.unit_name ?? "").toLowerCase().includes(q);
      return matchCode || matchName || matchUnit;
    });
  }, [cases, filter, search]);

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected],
  );

  const allSelected =
    filteredCases.length > 0 &&
    filteredCases.every((c) => !!selected[c.id]);

  const toggleCase = (id: number) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => {
        const next = { ...prev };
        filteredCases.forEach((c) => {
          delete next[c.id];
        });
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = { ...prev };
        filteredCases.forEach((c) => {
          next[c.id] = true;
        });
        return next;
      });
    }
  };

  // Metrics for 4 KPI Cards matching the screenshot
  const stats = useMemo(() => {
    const total = cases.length;
    const eligible = cases.filter((c) => ["eligible", "meeting_scheduled", "forwarded"].includes(c.status)).length;
    const needSupplement = cases.filter((c) => c.status === "need_supplement").length;
    const checking = cases.filter((c) => ["dt_checking", "tckt_checking", "vp_checking", "draft"].includes(c.status)).length;
    return { total, eligible, needSupplement, checking };
  }, [cases]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 4 Bento KPI Cards (Side-by-side matching screenshot) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <KpiCard
          icon="👥"
          label="Tổng hồ sơ tiếp nhận"
          value={stats.total}
          delta="+12%"
          deltaPositive={true}
        />
        <KpiCard
          icon="✓"
          label="Đủ điều kiện họp xét"
          value={stats.eligible}
          delta="+8%"
          deltaPositive={true}
        />
        <KpiCard
          icon="⚠️"
          label="Cần bổ sung hồ sơ"
          value={stats.needSupplement}
          delta="-4%"
          deltaPositive={false}
        />
        <KpiCard
          icon="⏳"
          label="Đang kiểm tra hồ sơ"
          value={stats.checking}
          delta="+15%"
          deltaPositive={true}
        />
      </div>

      {/* Sub-toolbar: Segmented Controls + Search + Filter/Sort buttons */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {/* Segmented Tab Pill Control */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "#f1f5f9",
            borderRadius: 8,
            padding: 3,
            border: `1px solid ${LINE}`,
            gap: 2,
          }}
        >
          {FILTER_DEFS.map((f) => {
            const count = cases.filter(f.match).length;
            const on = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                style={{
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 13,
                  fontWeight: on ? 600 : 400,
                  cursor: "pointer",
                  background: on ? PAPER : "transparent",
                  color: on ? INK : MUTED,
                  boxShadow: on ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  transition: "all 120ms ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>{f.label}</span>
                <span
                  style={{
                    fontSize: 11,
                    padding: "1px 5px",
                    borderRadius: 4,
                    background: on ? "#f1f5f9" : "transparent",
                    color: on ? INK : MUTED,
                    fontFamily: MONO,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Search & Filter Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo tên, MSSV, mã..."
            style={{ width: 240 }}
          />

          <button
            onClick={loadCases}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              borderRadius: 8,
              border: `1px solid ${LINE}`,
              background: PAPER,
              color: INK,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <span>⚲</span> Filter
          </button>

          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              borderRadius: 8,
              border: `1px solid ${LINE}`,
              background: PAPER,
              color: INK,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <span>⇅</span> Sort
          </button>
        </div>
      </div>

      {/* Batch Action Strip */}
      {selectedCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            background: "#0f172a",
            color: "#ffffff",
            borderRadius: 8,
            padding: "10px 18px",
            fontSize: 13,
          }}
        >
          <span>Đã chọn <b>{selectedCount}</b> hồ sơ</span>
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <Button variant="secondary" style={{ padding: "5px 12px", fontSize: 12 }}>
              Tiếp nhận hàng loạt
            </Button>
            <Button variant="danger" style={{ padding: "5px 12px", fontSize: 12 }}>
              Yêu cầu bổ sung
            </Button>
            <button
              onClick={() => setSelected({})}
              style={{
                border: "none",
                background: "transparent",
                color: "#94a3b8",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            color: "#b91c1c",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 13.5,
          }}
        >
          <span>{error}</span>
          <Button onClick={loadCases} style={{ padding: "4px 10px", fontSize: 12 }}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Dense Enterprise Data Table (Matching Reference Image) */}
      <div
        style={{
          border: `1px solid ${LINE}`,
          borderRadius: 12,
          background: PAPER,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 980, fontSize: 13.5, borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  background: "#f8fafc",
                  borderBottom: `1px solid ${LINE}`,
                  color: MUTED,
                  textAlign: "left",
                }}
              >
                <th style={{ padding: "12px 16px", width: 38 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    style={{ cursor: "pointer", accentColor: "#0f172a" }}
                  />
                </th>
                <th style={{ padding: "12px 14px", fontWeight: 500, fontSize: 12, color: MUTED }}>
                  Name of applicant ⇅
                </th>
                <th style={{ padding: "12px 14px", fontWeight: 500, fontSize: 12, color: MUTED }}>
                  Case ID ⇅
                </th>
                <th style={{ padding: "12px 14px", fontWeight: 500, fontSize: 12, color: MUTED }}>
                  Case type ⇅
                </th>
                <th style={{ padding: "12px 14px", fontWeight: 500, fontSize: 12, color: MUTED }}>
                  Department ⇅
                </th>
                <th style={{ padding: "12px 14px", fontWeight: 500, fontSize: 12, color: MUTED }}>
                  Duration / SLA ⇅
                </th>
                <th style={{ padding: "12px 14px", fontWeight: 500, fontSize: 12, color: MUTED }}>
                  Status
                </th>
                <th style={{ padding: "12px 16px", width: 44, textAlign: "center" }}>⋮</th>
              </tr>
            </thead>

            <tbody>
              {loading && cases.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "48px 20px", textAlign: "center", color: MUTED }}>
                    Đang tải dữ liệu hồ sơ từ máy chủ…
                  </td>
                </tr>
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "48px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 4 }}>
                      {cases.length === 0 ? "Chưa có hồ sơ trong hộp xử lý" : "Không tìm thấy hồ sơ"}
                    </div>
                    <div style={{ fontSize: 13, color: MUTED }}>
                      {cases.length === 0
                        ? "Hiện chưa có hồ sơ nào cần tiếp nhận trong đợt này."
                        : `Không có kết quả nào khớp với điều kiện lọc.`}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => {
                  const isLate = c.days_in_status > SLA_WARN_DAYS && c.status !== "forwarded";
                  const isRowSelected = !!selected[c.id];

                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderTop: `1px solid ${LINE_SOFT}`,
                        background: isRowSelected ? "#f8fafc" : PAPER,
                        transition: "background 80ms ease",
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: "12px 16px" }}>
                        <input
                          type="checkbox"
                          checked={isRowSelected}
                          onChange={() => toggleCase(c.id)}
                          style={{ cursor: "pointer", accentColor: "#0f172a" }}
                        />
                      </td>

                      {/* Name of applicant (Avatar + Name + Subtitle) */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar name={c.applicant_name} size={32} />
                          <div>
                            <div style={{ fontWeight: 600, color: INK, fontSize: 13.5 }}>
                              {c.applicant_name}
                            </div>
                            <div style={{ color: MUTED, fontSize: 11.5, marginTop: 1 }}>
                              {c.unit_name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Case ID (Underlined code linking to review) */}
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          onClick={() => onOpenCase(c.id)}
                          style={{
                            fontFamily: MONO,
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: INK,
                            textDecoration: "underline",
                            textUnderlineOffset: "3px",
                            textDecorationThickness: "1px",
                            cursor: "pointer",
                          }}
                        >
                          {c.code}
                        </span>
                      </td>

                      {/* Case type */}
                      <td style={{ padding: "12px 14px", color: INK }}>
                        <span style={{ fontSize: 13 }}>
                          {c.case_type === "ket_nap" ? "Kết nạp Đảng" : "Chuyển chính thức"}
                        </span>
                      </td>

                      {/* Department */}
                      <td style={{ padding: "12px 14px", color: MUTED }}>
                        <span style={{ fontSize: 13 }}>{c.unit_name}</span>
                      </td>

                      {/* Duration / SLA */}
                      <td style={{ padding: "12px 14px" }}>
                        {isLate ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              background: "#fef2f2",
                              color: "#b91c1c",
                              border: "1px solid #fca5a5",
                              borderRadius: 9999,
                              padding: "2px 8px",
                              fontSize: 11.5,
                              fontWeight: 600,
                              fontFamily: MONO,
                            }}
                          >
                            ⚠ {c.days_in_status} ngày
                          </span>
                        ) : (
                          <span style={{ fontFamily: MONO, fontSize: 12.5, color: MUTED }}>
                            {c.days_in_status} ngày
                          </span>
                        )}
                      </td>

                      {/* Status (Capsule Pill) */}
                      <td style={{ padding: "12px 14px" }}>
                        <Pill tone={statusTone(c.status)}>
                          {c.status_label || c.status}
                        </Pill>
                      </td>

                      {/* Action Menu (3-dots) */}
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <button
                          onClick={() => onOpenCase(c.id)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            border: `1px solid ${LINE}`,
                            background: PAPER,
                            color: MUTED,
                            cursor: "pointer",
                            fontSize: 14,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Mở thẩm định"
                        >
                          ⋮
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination Bar (Matching Screenshot) */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: `1px solid ${LINE}`,
            background: "#ffffff",
            fontSize: 12.5,
            color: MUTED,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {/* Left: Records dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                border: `1px solid ${LINE}`,
                borderRadius: 6,
                padding: "4px 8px",
                background: "#ffffff",
                color: INK,
                fontWeight: 500,
                fontSize: 12,
              }}
            >
              10 records ⌄
            </span>
          </div>

          {/* Center: Pagination numbers */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              disabled
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: `1px solid ${LINE}`,
                background: "#f8fafc",
                color: MUTED,
                cursor: "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ‹
            </button>
            <button
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: `1px solid #0f172a`,
                background: "#0f172a",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              1
            </button>
            <button
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: `1px solid ${LINE}`,
                background: "#ffffff",
                color: INK,
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              2
            </button>
            <span style={{ padding: "0 4px", color: MUTED }}>…</span>
            <button
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: `1px solid ${LINE}`,
                background: "#ffffff",
                color: MUTED,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ›
            </button>
          </div>

          {/* Right: Total range count */}
          <div style={{ fontWeight: 500, color: INK }}>
            1 - {filteredCases.length} of {cases.length} records
          </div>
        </div>
      </div>
    </div>
  );
}

