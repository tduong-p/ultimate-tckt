import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { getToken, setToken, verifyCode, type TokenOut } from "./api";

const SESSION_KEY = "ctd.session";

type Session = { role: string; fullName: string };

function loadSession(): Session | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    const roleParam = params.get("role");
    const nameParam = params.get("name");
    if (tokenParam && roleParam) {
      setToken(tokenParam);
      const s = { role: roleParam, fullName: nameParam || "Người dùng" };
      localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      return s;
    }
  } catch {}

  if (!getToken()) return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

type AuthState = {
  session: Session | null;
  login: (email: string, code: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(loadSession);

  const login = async (email: string, code: string) => {
    const res: TokenOut = await verifyCode(email, code);
    setToken(res.access_token);
    const next = { role: res.role, fullName: res.full_name };
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setSession(next);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  const value = useMemo(() => ({ session, login, logout }), [session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải dùng bên trong AuthProvider.");
  return ctx;
}
