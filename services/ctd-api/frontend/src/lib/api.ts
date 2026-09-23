/** Lớp gọi API duy nhất — mọi màn đều đi qua đây, không tự fetch() rải rác.
 *  Token lưu ở localStorage, tự gắn header Authorization và tự đăng xuất khi 401. */

const TOKEN_KEY = "ctd.token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = init;
  const finalHeaders = new Headers(headers);
  const token = getToken();
  if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  let body = rest.body;
  if (json !== undefined) {
    finalHeaders.set("Content-Type", "application/json");
    body = JSON.stringify(json);
  }

  const res = await fetch(`/api${path}`, { ...rest, headers: finalHeaders, body });

  if (res.status === 401) {
    setToken(null);
    window.location.reload();
    throw new ApiError(401, "Phiên đăng nhập đã hết hạn.");
  }
  if (!res.ok) {
    let message = `Lỗi ${res.status}`;
    try {
      const data = await res.json();
      message = data.detail ?? message;
    } catch {
      // body không phải JSON — giữ thông báo mặc định
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---- Xác thực ----

export function requestCode(email: string): Promise<void> {
  return request("/auth/request-code", { method: "POST", json: { email } });
}

export type TokenOut = { access_token: string; role: string; full_name: string };

export function verifyCode(email: string, code: string): Promise<TokenOut> {
  return request("/auth/verify", { method: "POST", json: { email, code } });
}

// ---- Hồ sơ ----

export type DocumentOut = {
  id: number;
  name: string;
  status: "not_submitted" | "submitted" | "accepted" | "rejected" | "not_applicable";
  filename: string;
  reason: string;
  is_required: boolean;
  allow_not_applicable: boolean;
  is_adhoc: boolean;
};

export type ActionOut = { action_code: string; label: string; requires_reason: boolean };

export type CaseOut = {
  id: number;
  code: string;
  case_type: "ket_nap" | "chuyen_chinh_thuc";
  status: string;
  status_label: string;
  unit_name: string;
  applicant_name: string;
  state_entered_at: string;
  days_in_status: number;
  documents: DocumentOut[];
  available_actions: ActionOut[];
};

export type CaseEventOut = {
  created_at: string;
  action_label: string;
  to_status_label: string;
  actor_name: string;
  reason: string;
};

export function listCases(status?: string): Promise<CaseOut[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return request(`/cases${qs}`);
}

export function getCase(id: number): Promise<CaseOut> {
  return request(`/cases/${id}`);
}

export function createCase(caseType: CaseOut["case_type"], batchId?: number): Promise<CaseOut> {
  return request("/cases", { method: "POST", json: { case_type: caseType, batch_id: batchId ?? null } });
}

export function performAction(caseId: number, actionCode: string, reason = ""): Promise<CaseOut> {
  return request(`/cases/${caseId}/actions`, { method: "POST", json: { action_code: actionCode, reason } });
}

export function caseEvents(caseId: number): Promise<CaseEventOut[]> {
  return request(`/cases/${caseId}/events`);
}

export type CaseDetailIn = {
  phone: string;
  personal_email: string;
  citizen_id: string;
  permanent_address: string;
  temp_address?: string;
  emergency_contact_name: string;
  emergency_contact_relation: string;
  emergency_contact_phone: string;
  gpa: number;
  conduct_score: number;
};

export function updateCaseDetail(caseId: number, payload: CaseDetailIn) {
  return request(`/cases/${caseId}/detail`, { method: "PUT", json: payload });
}

// ---- Giấy tờ ----

export function uploadDocumentFile(documentId: number, file: File): Promise<DocumentOut> {
  const form = new FormData();
  form.append("file", file);
  return request(`/documents/${documentId}/file`, { method: "POST", body: form });
}

export function markVerdict(documentId: number, verdict: DocumentOut["status"], reason = ""): Promise<DocumentOut> {
  return request(`/documents/${documentId}/verdict`, { method: "POST", json: { verdict, reason } });
}

export function markNotApplicable(documentId: number, reason: string): Promise<DocumentOut> {
  return request(`/documents/${documentId}/not-applicable`, { method: "POST", json: { reason } });
}

export function documentUrl(documentId: number): Promise<{ url: string; expires_seconds: number }> {
  return request(`/documents/${documentId}/url`);
}

export function addAdhocDocument(caseId: number, name: string): Promise<DocumentOut> {
  return request(`/cases/${caseId}/documents`, { method: "POST", json: { name } });
}
