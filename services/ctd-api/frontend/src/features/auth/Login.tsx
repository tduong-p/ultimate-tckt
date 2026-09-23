/** Đăng nhập bằng Mật khẩu hoặc Mã OTP qua email — thiết kế theo Clay Design Language. */
import { useState } from "react";
import { Button, Card, DisplayTitle, ScreenTag } from "../../components/ui";
import { ApiError, requestCode } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { BG, BUTTON_RADIUS, CANDY, INK, LINE, MUTED, PAPER, RED } from "../../theme/tokens";

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  border: `1px solid ${LINE}`,
  borderRadius: BUTTON_RADIUS,
  outline: "none",
  fontSize: 14,
  marginTop: 6,
  background: PAPER,
  color: INK,
  boxSizing: "border-box" as const,
  transition: "border-color 100ms ease",
};

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !code) return;
    setLoading(true);
    setError("");
    try {
      await login(email, code);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Đăng nhập thất bại. Kiểm tra lại email và mật khẩu / mã OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!email) {
      setError("Vui lòng nhập email trước khi nhận mã OTP.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await requestCode(email);
      setOtpSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không gửi được mã. Thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Card style={{ padding: "36px 32px", width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <ScreenTag>Đăng nhập hệ thống</ScreenTag>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: RED,
              color: PAPER,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Đ
          </div>
        </div>

        <DisplayTitle size={22} style={{ marginTop: 8 }}>
          Xét duyệt hồ sơ Đảng
        </DisplayTitle>

        <div style={{ fontSize: 13.5, color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
          Đoàn Thanh niên – Đảng ủy Trường. Đăng nhập bằng tài khoản quản trị hoặc mã xác nhận qua email trường cấp.
        </div>

        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Email input */}
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: INK }}>
            Email trường (@sis / @hust / @vnu...)
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              placeholder="vd: tckt.dtn@hust.edu.vn"
              style={inputStyle}
              onKeyDown={(e) => {
                if (e.key === "Enter" && email && code) handleLogin();
              }}
            />
          </label>

          {/* Password or OTP input */}
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: INK }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Mật khẩu hoặc Mã OTP</span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: "transparent",
                  border: 0,
                  fontSize: 12,
                  color: MUTED,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (error) setError("");
              }}
              placeholder="Nhập mật khẩu hoặc 6 số OTP"
              style={inputStyle}
              onKeyDown={(e) => {
                if (e.key === "Enter" && email && code) handleLogin();
              }}
            />
          </label>

          {/* Notification when OTP is sent */}
          {otpSent && (
            <div
              style={{
                background: CANDY.blue.bg,
                color: CANDY.blue.fg,
                border: `1px solid ${CANDY.blue.border}`,
                borderRadius: BUTTON_RADIUS,
                padding: "10px 14px",
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              Mã xác nhận đã được gửi tới <b>{email}</b>. Vui lòng kiểm tra hòm thư.
            </div>
          )}

          {/* Login Button */}
          <Button
            variant="primary"
            disabled={loading || !email || !code}
            onClick={handleLogin}
            style={{ width: "100%", marginTop: 4, padding: "12px 18px", fontSize: 14 }}
          >
            {loading ? "Đang xử lý…" : "Đăng nhập"}
          </Button>

          {/* OTP Request Option */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6 }}>
            <span style={{ fontSize: 12.5, color: MUTED }}>Chưa có mật khẩu?</span>
            <button
              type="button"
              disabled={loading || !email}
              onClick={handleSendOtp}
              style={{
                background: "transparent",
                border: 0,
                color: INK,
                fontWeight: 600,
                fontSize: 12.5,
                cursor: email ? "pointer" : "not-allowed",
                padding: "4px 0",
                textDecoration: "underline",
                opacity: email ? 1 : 0.5,
              }}
            >
              Gửi mã OTP qua email
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: 18,
              fontSize: 13,
              background: CANDY.coral.bg,
              color: CANDY.coral.fg,
              border: `1px solid ${CANDY.coral.border}`,
              borderRadius: BUTTON_RADIUS,
              padding: "10px 14px",
            }}
          >
            {error}
          </div>
        )}
      </Card>
    </div>
  );
}

