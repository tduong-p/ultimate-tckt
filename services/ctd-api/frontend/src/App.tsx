import { useState } from "react";
import { CaseStatus } from "./features/hoso/CaseStatus";
import { SubmitCase } from "./features/hoso/SubmitCase";
import { Inbox } from "./features/canbo/Inbox";
import { ReviewCase } from "./features/canbo/ReviewCase";
import { Dashboard } from "./features/baocao/Dashboard";
import { Login } from "./features/auth/Login";
import { useAuth } from "./lib/auth";
import {
  BG_CANVAS,
  BUTTON_RADIUS,
  FONT,
  INK,
  LINE,
  MONO,
  MUTED,
  RED,
  SURFACE,
} from "./theme/tokens";

type Screen = "S2" | "S3" | "C1" | "C2" | "C6";

const CAN_BO_ROLES = new Set(["can_bo_don_vi", "tckt", "vp_doan", "chi_bo", "quan_tri"]);

export default function App() {
  const { session, logout } = useAuth();

  if (!session) return <Login />;

  const isCanBo = CAN_BO_ROLES.has(session.role);
  return (
    <Shell
      isCanBo={isCanBo}
      fullName={session.fullName}
      role={session.role}
      onLogout={logout}
    />
  );
}

function Shell({
  isCanBo,
  fullName,
  role,
  onLogout,
}: {
  isCanBo: boolean;
  fullName: string;
  role: string;
  onLogout: () => void;
}) {
  const initScreen = (() => {
    try {
      const q = new URLSearchParams(window.location.search).get("screen") as Screen | null;
      if (q) return q;
    } catch {}
    return isCanBo ? "C1" : "S2";
  })();
  const initCaseId = (() => {
    try {
      const c = new URLSearchParams(window.location.search).get("case_id");
      return c ? Number(c) : null;
    } catch {}
    return null;
  })();
  const [screen, setScreen] = useState<Screen>(initScreen);
  const [openCaseId, setOpenCaseId] = useState<number | null>(initCaseId);

  const roleLabel =
    role === "can_bo_don_vi"
      ? "Cán bộ Đơn vị"
      : role === "tckt"
      ? "Ban TCKT"
      : role === "vp_doan"
      ? "VP Đoàn"
      : role === "sinh_vien"
      ? "Sinh viên"
      : "Quản trị viên";

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(-2)
      .map((w) => w[0].toUpperCase())
      .join("") || "AD";

  // Screen Title for Topbar
  const pageTitle =
    screen === "C1"
      ? "Hộp xử lý hồ sơ"
      : screen === "C2"
      ? "Kiểm tra chi tiết hồ sơ"
      : screen === "C6"
      ? "Toàn cảnh báo cáo"
      : screen === "S2"
      ? "Trạng thái hồ sơ của tôi"
      : "Nộp hồ sơ Đảng";

  if (!isCanBo) {
    // Student layout: Clean focused canvas
    return (
      <div
        style={{
          fontFamily: FONT,
          color: INK,
          background: BG_CANVAS,
          minHeight: "100vh",
          padding: "24px 16px 60px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: 1060,
            margin: "0 auto",
            background: SURFACE,
            borderRadius: 16,
            border: `1px solid ${LINE}`,
            boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
            overflow: "hidden",
          }}
        >
          {/* Topbar for student */}
          <header
            style={{
              padding: "16px 28px",
              borderBottom: `1px solid ${LINE}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: SURFACE,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: RED,
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                Đ
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14.5, color: INK }}>CTD HUST</div>
                <div style={{ fontSize: 11.5, color: MUTED }}>Cổng nộp hồ sơ Đảng viên sinh viên</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setScreen("S2")}
                style={{
                  padding: "7px 14px",
                  borderRadius: BUTTON_RADIUS,
                  border: `1px solid ${screen === "S2" ? INK : "transparent"}`,
                  background: screen === "S2" ? INK : "transparent",
                  color: screen === "S2" ? "#ffffff" : MUTED,
                  fontSize: 13,
                  fontWeight: screen === "S2" ? 600 : 500,
                  cursor: "pointer",
                }}
              >
                Hồ sơ của tôi
              </button>
              <button
                onClick={() => setScreen("S3")}
                style={{
                  padding: "7px 14px",
                  borderRadius: BUTTON_RADIUS,
                  border: `1px solid ${screen === "S3" ? INK : "transparent"}`,
                  background: screen === "S3" ? INK : "transparent",
                  color: screen === "S3" ? "#ffffff" : MUTED,
                  fontSize: 13,
                  fontWeight: screen === "S3" ? 600 : 500,
                  cursor: "pointer",
                }}
              >
                Nộp hồ sơ mới
              </button>
              <div style={{ width: 1, height: 20, background: LINE, margin: "0 6px" }} />
              <button
                onClick={onLogout}
                style={{
                  padding: "6px 12px",
                  borderRadius: BUTTON_RADIUS,
                  border: `1px solid ${LINE}`,
                  background: SURFACE,
                  color: MUTED,
                  fontSize: 12.5,
                  cursor: "pointer",
                }}
              >
                Đăng xuất
              </button>
            </div>
          </header>

          <main style={{ padding: "28px 32px" }}>
            {screen === "S2" && <CaseStatus />}
            {screen === "S3" && <SubmitCase />}
          </main>
        </div>
      </div>
    );
  }

  // Staff & Admin Layout: Left Sidebar + Floating Enterprise Frame
  return (
    <div
      style={{
        fontFamily: FONT,
        color: INK,
        background: BG_CANVAS,
        minHeight: "100vh",
        padding: "16px 20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          background: SURFACE,
          borderRadius: 16,
          border: `1px solid ${LINE}`,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
          minHeight: "calc(100vh - 32px)",
          display: "flex",
          overflow: "hidden",
        }}
      >
        {/* Left Sidebar (250px Cố định) */}
        <aside
          style={{
            width: 250,
            borderRight: `1px solid ${LINE}`,
            background: SURFACE,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "20px 16px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Logo Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "#0f172a",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  ❖
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em", color: INK }}>
                  CTD HUST
                </div>
              </div>
              <span style={{ fontSize: 14, color: MUTED, cursor: "pointer" }} title="Thu gọn">
                ◨
              </span>
            </div>

            {/* Quick Search */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#f8fafc",
                border: `1px solid ${LINE}`,
                borderRadius: 8,
                padding: "6px 10px",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 13, color: MUTED }}>🔍</span>
              <input
                type="text"
                placeholder="Search..."
                style={{
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  fontSize: 13,
                  color: INK,
                  width: "100%",
                  fontFamily: FONT,
                }}
              />
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: MUTED,
                  background: "#ffffff",
                  border: `1px solid ${LINE}`,
                  borderRadius: 4,
                  padding: "1px 5px",
                  fontFamily: MONO,
                }}
              >
                ⌘ F
              </span>
            </div>

            {/* Navigation Menu */}
            <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {/* Dashboard */}
              <button
                onClick={() => setScreen("C6")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: screen === "C6" ? "#f1f5f9" : "transparent",
                  color: screen === "C6" ? INK : MUTED,
                  fontWeight: screen === "C6" ? 600 : 500,
                  fontSize: 13.5,
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <span>⊞</span> Dashboard
              </button>

              {/* Nhóm Hồ sơ Đảng */}
              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "4px 12px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: MUTED,
                    textTransform: "uppercase",
                    letterSpacing: ".04em",
                  }}
                >
                  <span>Hồ sơ Đảng</span>
                  <span>⌄</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                  <button
                    onClick={() => setScreen("C1")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "none",
                      borderLeft: screen === "C1" ? `3px solid #0f172a` : "3px solid transparent",
                      background: screen === "C1" ? "#f8fafc" : "transparent",
                      color: screen === "C1" ? INK : MUTED,
                      fontWeight: screen === "C1" ? 600 : 400,
                      fontSize: 13.5,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span>📁</span> Hộp xử lý
                  </button>

                  <button
                    onClick={() => setScreen("C2")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "none",
                      borderLeft: screen === "C2" ? `3px solid #0f172a` : "3px solid transparent",
                      background: screen === "C2" ? "#f8fafc" : "transparent",
                      color: screen === "C2" ? INK : MUTED,
                      fontWeight: screen === "C2" ? 600 : 400,
                      fontSize: 13.5,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span>✓</span> Kiểm tra hồ sơ
                  </button>
                </div>
              </div>

              {/* Nhóm Quản trị (Chỉ hiện nếu quan_tri) */}
              {role === "quan_tri" && (
                <div style={{ marginTop: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "4px 12px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: MUTED,
                      textTransform: "uppercase",
                      letterSpacing: ".04em",
                    }}
                  >
                    <span>Quản trị</span>
                    <span>⌄</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                    <div
                      style={{
                        padding: "7px 12px",
                        fontSize: 13,
                        color: MUTED,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                      }}
                    >
                      <span>⚙</span> Cán bộ &amp; Đơn vị
                    </div>
                    <div
                      style={{
                        padding: "7px 12px",
                        fontSize: 13,
                        color: MUTED,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                      }}
                    >
                      <span>📅</span> Đợt xét hồ sơ
                    </div>
                  </div>
                </div>
              )}
            </nav>
          </div>

          {/* User Profile Card at bottom of Sidebar */}
          <div
            style={{
              background: "#f8fafc",
              border: `1px solid ${LINE}`,
              borderRadius: 10,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#2563eb",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: INK,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {fullName}
                </div>
                <div style={{ fontSize: 11, color: MUTED }}>{roleLabel}</div>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Đăng xuất"
              style={{
                border: "none",
                background: "transparent",
                color: MUTED,
                cursor: "pointer",
                fontSize: 14,
                padding: 4,
              }}
            >
              🚪
            </button>
          </div>
        </aside>

        {/* Right Main Content Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Topbar Header */}
          <header
            style={{
              height: 64,
              borderBottom: `1px solid ${LINE}`,
              padding: "0 32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: SURFACE,
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: INK }}>
              {pageTitle}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: `1px solid ${LINE}`,
                  background: SURFACE,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: MUTED,
                  cursor: "pointer",
                }}
                title="Thông báo"
              >
                🔔
              </button>

              <button
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: `1px solid ${LINE}`,
                  background: SURFACE,
                  color: INK,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Export CSV
              </button>

              <button
                onClick={() => setScreen("C1")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: `1px solid #0f172a`,
                  background: "#0f172a",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                + Thao tác
              </button>
            </div>
          </header>

          {/* Workspace Body */}
          <main style={{ flex: 1, padding: "24px 32px 48px", overflowY: "auto" }}>
            {screen === "C1" && (
              <Inbox
                onOpenCase={(id) => {
                  setOpenCaseId(id);
                  setScreen("C2");
                }}
              />
            )}
            {screen === "C2" && (
              <ReviewCase caseId={openCaseId ?? 2} onBack={() => setScreen("C1")} />
            )}
            {screen === "C6" && <Dashboard />}
          </main>
        </div>
      </div>
    </div>
  );
}

