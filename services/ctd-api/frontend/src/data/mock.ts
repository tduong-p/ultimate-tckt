/** Dữ liệu mẫu — lấy nguyên từ file design canvas.
 *  Thay bằng lời gọi API khi backend xong; hình dạng ở đây cố ý khớp
 *  các bảng đã thiết kế (case / document / document_type / status_def). */
import type { Tone } from "../theme/tokens";

export type CaseRow = {
  name: string;
  mssv: string;
  unit: string;
  type: string;
  status: string;
  tone: Tone;
  docs: string;
  docOk: boolean;
  days: number;
};

export const ROWS: CaseRow[] = [
  { name: "Nguyễn Minh Anh", mssv: "20215412", unit: "LCĐ Khoa CNTT", type: "Kết nạp", status: "Chờ tôi kiểm tra", tone: "warn", docs: "6/7", docOk: false, days: 9 },
  { name: "Trần Quốc Bảo", mssv: "20218890", unit: "LCĐ Khoa CNTT", type: "Kết nạp", status: "Chờ tôi kiểm tra", tone: "warn", docs: "7/7", docOk: true, days: 2 },
  { name: "Lê Thu Hà", mssv: "20204471", unit: "LCĐ Khoa Điện", type: "Chuyển chính thức", status: "Chờ tôi kiểm tra", tone: "warn", docs: "7/7", docOk: true, days: 1 },
  { name: "Phạm Đức Duy", mssv: "20219034", unit: "LCĐ Khoa Cơ khí", type: "Kết nạp", status: "Đủ điều kiện họp xét", tone: "info", docs: "7/7", docOk: true, days: 4 },
  { name: "Vũ Khánh Linh", mssv: "20211123", unit: "LCĐ Khoa CNTT", type: "Kết nạp", status: "Đã yêu cầu bổ sung", tone: "neutral", docs: "5/7", docOk: false, days: 12 },
  { name: "Hoàng Nam Sơn", mssv: "20207765", unit: "LCĐ Khoa Điện", type: "Chuyển chính thức", status: "Ban TCKT kiểm tra", tone: "info", docs: "7/7", docOk: true, days: 3 },
  { name: "Đỗ Thanh Mai", mssv: "20216698", unit: "LCĐ Khoa Hoá", type: "Kết nạp", status: "Thông qua LCĐ", tone: "ok", docs: "7/7", docOk: true, days: 1 },
  { name: "Bùi Gia Huy", mssv: "20203310", unit: "LCĐ Khoa Cơ khí", type: "Kết nạp", status: "Không thông qua", tone: "danger", docs: "7/7", docOk: true, days: 6 },
];

/** Tương ứng bảng `document_type` — danh mục giấy tờ, không hardcode trong UI thật. */
export const DOC_NAMES = [
  "Đơn xin vào Đảng",
  "Lý lịch của người xin vào Đảng",
  "Giấy chứng nhận lớp bồi dưỡng nhận thức về Đảng",
  "Bảng điểm học kỳ 1",
  "Bảng điểm học kỳ 2",
  "Xác nhận của chi hội sinh viên",
  "Ảnh 3x4",
];

export const CASE_STEPS = [
  { label: "Sinh viên nộp hồ sơ", note: "05/09/2026", st: "done" },
  { label: "LCĐ Khoa CNTT kiểm tra", note: "Trả về yêu cầu bổ sung · 12/09/2026", st: "current" },
  { label: "Ban TCKT kiểm tra", note: "", st: "todo" },
  { label: "Họp xét cấp ĐT/LCĐ", note: "Dự kiến đợt 2026-2", st: "todo" },
  { label: "VP Đoàn rà soát & chuyển Chi bộ", note: "", st: "todo" },
] as const;

export const HISTORY = [
  { date: "12/09", action: "Yêu cầu bổ sung", who: "Trần Văn Hùng · LCĐ Khoa CNTT" },
  { date: "09/09", action: "Bắt đầu kiểm tra hồ sơ", who: "Trần Văn Hùng · LCĐ Khoa CNTT" },
  { date: "06/09", action: "Tiếp nhận hồ sơ", who: "Hệ thống" },
  { date: "05/09", action: "Gửi hồ sơ", who: "Nguyễn Minh Anh" },
];

export const LOCKED_FIELDS = [
  { label: "Họ và tên", value: "Nguyễn Minh Anh" },
  { label: "Mã sinh viên", value: "20215412" },
  { label: "Ngày sinh", value: "14/03/2004" },
  { label: "Lớp · Khoá", value: "CNTT-02 · K66" },
];

export const FORM_STEPS = ["Cá nhân", "Liên hệ & lý lịch", "Giấy tờ", "Xem lại"];

/** Trạng thái từng giấy tờ của hồ sơ đang mở (bảng `document.status`). */
export const DOC_STATES = ["ok", "ok", "ok", "ok", "fail", "missing", "ok"] as const;
export type DocState = (typeof DOC_STATES)[number];

export const KPIS = [
  { label: "Hồ sơ trong đợt", value: "184", note: "62 kết nạp · 122 chuyển chính thức", fg: "#1f2733" },
  { label: "Đang chờ xử lý", value: "57", note: "ở 4 cấp duyệt", fg: "#1c2e5e" },
  { label: "Quá hạn 7 ngày", value: "23", note: "tập trung ở LCĐ Khoa CNTT", fg: "#b91c1c" },
  { label: "Thời gian xử lý TB", value: "26", note: "ngày từ nộp đến chuyển Chi bộ", fg: "#1f2733" },
];

export const STATUS_BARS = [
  { label: "Chờ LCĐ kiểm tra", value: 31, color: "#b45309" },
  { label: "Đủ điều kiện họp xét", value: 18, color: "#1c2e5e" },
  { label: "Chờ Ban TCKT", value: 8, color: "#1d4ed8" },
  { label: "Đã chuyển Chi bộ", value: 113, color: "#15803d" },
  { label: "Không thông qua", value: 14, color: "#b91c1c" },
];

export const BACKLOG = [
  { name: "Vũ Khánh Linh", at: "Đã yêu cầu bổ sung", days: 12 },
  { name: "Nguyễn Minh Anh", at: "LCĐ kiểm tra", days: 9 },
  { name: "Bùi Gia Huy", at: "Ban TCKT kiểm tra", days: 6 },
  { name: "Ngô Hải Yến", at: "VP Đoàn rà soát", days: 6 },
  { name: "Lý Tuấn Kiệt", at: "LCĐ kiểm tra", days: 5 },
];

export const FILTERS = [
  { label: "Đang chờ tôi", count: "3" },
  { label: "Đủ điều kiện họp xét", count: "1" },
  { label: "Đã yêu cầu bổ sung", count: "1" },
  { label: "Quá hạn 7 ngày", count: "3" },
  { label: "Tất cả", count: "8" },
];
