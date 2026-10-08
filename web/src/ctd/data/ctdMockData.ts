export interface DocumentItem {
  id: number;
  title: string;
  isRequired: boolean;
  status: 'ok' | 'pending' | 'need_supplement' | 'not_applicable';
  feedback?: string;
  fileName?: string;
  fileSize?: string;
}

export interface HistoryItem {
  id: number;
  date: string;
  actor: string;
  action: string;
  note?: string;
}

export interface CtdCase {
  id: number;
  code: string;
  fullName: string;
  studentId: string;
  birthDate: string;
  className: string;
  unit: string;
  caseType: 'Kết nạp' | 'Chuyển chính thức';
  status:
    | 'draft'
    | 'dt_checking'
    | 'need_supplement'
    | 'tckt_checking'
    | 'eligible'
    | 'meeting_scheduled'
    | 'vp_checking'
    | 'forwarded'
    | 'cancelled';
  statusLabel: string;
  submittedDate: string;
  updatedDate: string;
  daysInStatus: number;
  slaDays: number;
  completedDocs: number;
  totalDocs: number;
  documents: DocumentItem[];
  history: HistoryItem[];
}

export const STATUS_CONFIG: Record<
  string,
  { label: string; appearance: 'default' | 'inprogress' | 'success' | 'removed' | 'new' | 'moved' }
> = {
  draft: { label: 'Nháp', appearance: 'default' },
  dt_checking: { label: 'Chờ LCĐ kiểm tra', appearance: 'inprogress' },
  need_supplement: { label: 'Cần bổ sung', appearance: 'moved' },
  tckt_checking: { label: 'Ban TCKT kiểm tra', appearance: 'inprogress' },
  eligible: { label: 'Đủ điều kiện họp xét', appearance: 'success' },
  meeting_scheduled: { label: 'Chờ họp xét', appearance: 'new' },
  vp_checking: { label: 'VP Đoàn rà soát', appearance: 'inprogress' },
  forwarded: { label: 'Đã chuyển Chi bộ', appearance: 'success' },
  cancelled: { label: 'Đã huỷ', appearance: 'removed' },
};

export const INITIAL_CASES: CtdCase[] = [
  {
    id: 1,
    code: 'HS-2026-001',
    fullName: 'Nguyễn Minh Anh',
    studentId: '20215412',
    birthDate: '14/03/2004',
    className: 'CNTT-02 K66',
    unit: 'LCĐ Khoa CNTT',
    caseType: 'Kết nạp',
    status: 'need_supplement',
    statusLabel: 'Cần bổ sung',
    submittedDate: '05/09/2026',
    updatedDate: '12/09/2026',
    daysInStatus: 9,
    slaDays: 7,
    completedDocs: 5,
    totalDocs: 7,
    documents: [
      { id: 1, title: 'Đơn xin vào Đảng', isRequired: true, status: 'ok', fileName: 'Don_xin_vao_Dang_NMA.pdf', fileSize: '1.2 MB' },
      { id: 2, title: 'Lý lịch của người xin vào Đảng', isRequired: true, status: 'ok', fileName: 'Ly_lich_NMA.pdf', fileSize: '4.8 MB' },
      { id: 3, title: 'Giấy chứng nhận bồi dưỡng nhận thức Đảng', isRequired: true, status: 'ok', fileName: 'GCN_Lop_cam_tinh_Dang.pdf', fileSize: '850 KB' },
      { id: 4, title: 'Bảng điểm tích luỹ học kỳ 1', isRequired: true, status: 'ok', fileName: 'Bang_diem_HK1.pdf', fileSize: '620 KB' },
      { id: 5, title: 'Bảng điểm tích luỹ học kỳ 2', isRequired: true, status: 'need_supplement', feedback: 'Bảng điểm thiếu dấu mộc đỏ của phòng Đào tạo', fileName: 'Bang_diem_HK2_chua_dau.pdf', fileSize: '580 KB' },
      { id: 6, title: 'Xác nhận của chi hội sinh viên', isRequired: true, status: 'pending', fileName: 'Xac_nhan_Chi_hoi.pdf', fileSize: '430 KB' },
      { id: 7, title: 'Ảnh chân dung 3x4 (nền trắng)', isRequired: true, status: 'ok', fileName: 'Anh_3x4.jpg', fileSize: '320 KB' },
    ],
    history: [
      { id: 1, date: '12/09/2026 14:30', actor: 'Trần Văn Hùng (LCĐ Khoa CNTT)', action: 'Yêu cầu bổ sung', note: 'Bảng điểm HK2 thiếu xác nhận đào tạo' },
      { id: 2, date: '09/09/2026 09:15', actor: 'Trần Văn Hùng (LCĐ Khoa CNTT)', action: 'Bắt đầu kiểm tra hồ sơ' },
      { id: 3, date: '06/09/2026 10:00', actor: 'Hệ thống CTD', action: 'Tiếp nhận hồ sơ hợp lệ từ sinh viên' },
      { id: 4, date: '05/09/2026 16:45', actor: 'Nguyễn Minh Anh (Sinh viên)', action: 'Gửi hồ sơ xét kết nạp' },
    ],
  },
  {
    id: 2,
    code: 'HS-2026-002',
    fullName: 'Trần Quốc Bảo',
    studentId: '20218890',
    birthDate: '20/11/2003',
    className: 'CNTT-01 K66',
    unit: 'LCĐ Khoa CNTT',
    caseType: 'Kết nạp',
    status: 'dt_checking',
    statusLabel: 'Chờ LCĐ kiểm tra',
    submittedDate: '01/10/2026',
    updatedDate: '06/10/2026',
    daysInStatus: 2,
    slaDays: 7,
    completedDocs: 7,
    totalDocs: 7,
    documents: [
      { id: 1, title: 'Đơn xin vào Đảng', isRequired: true, status: 'ok', fileName: 'Don_BaoTQ.pdf', fileSize: '1.1 MB' },
      { id: 2, title: 'Lý lịch của người xin vào Đảng', isRequired: true, status: 'ok', fileName: 'Ly_lich_BaoTQ.pdf', fileSize: '5.2 MB' },
      { id: 3, title: 'Giấy chứng nhận bồi dưỡng nhận thức Đảng', isRequired: true, status: 'ok', fileName: 'GCN_BaoTQ.pdf', fileSize: '900 KB' },
      { id: 4, title: 'Bảng điểm tích luỹ học kỳ 1', isRequired: true, status: 'ok', fileName: 'BD1_BaoTQ.pdf', fileSize: '700 KB' },
      { id: 5, title: 'Bảng điểm tích luỹ học kỳ 2', isRequired: true, status: 'ok', fileName: 'BD2_BaoTQ.pdf', fileSize: '720 KB' },
      { id: 6, title: 'Xác nhận của chi hội sinh viên', isRequired: true, status: 'ok', fileName: 'XN_Chihoi_BaoTQ.pdf', fileSize: '450 KB' },
      { id: 7, title: 'Ảnh chân dung 3x4 (nền trắng)', isRequired: true, status: 'ok', fileName: 'Anh_BaoTQ.jpg', fileSize: '280 KB' },
    ],
    history: [
      { id: 1, date: '06/10/2026 11:20', actor: 'Trần Văn Hùng (LCĐ Khoa CNTT)', action: 'Bắt đầu rà soát hồ sơ' },
      { id: 2, date: '01/10/2026 15:30', actor: 'Trần Quốc Bảo (Sinh viên)', action: 'Gửi hồ sơ xét kết nạp' },
    ],
  },
  {
    id: 3,
    code: 'HS-2026-003',
    fullName: 'Lê Thu Hà',
    studentId: '20204471',
    birthDate: '08/05/2002',
    className: 'Dien-03 K65',
    unit: 'LCĐ Khoa Điện',
    caseType: 'Chuyển chính thức',
    status: 'tckt_checking',
    statusLabel: 'Ban TCKT kiểm tra',
    submittedDate: '25/09/2026',
    updatedDate: '07/10/2026',
    daysInStatus: 1,
    slaDays: 5,
    completedDocs: 7,
    totalDocs: 7,
    documents: [
      { id: 1, title: 'Bản tự kiểm điểm đảng viên dự bị', isRequired: true, status: 'ok', fileName: 'Kiem_diem_LeThuHa.pdf', fileSize: '1.4 MB' },
      { id: 2, title: 'Ý kiến nhận xét của đoàn thể', isRequired: true, status: 'ok', fileName: 'Nhan_xet_Doan_the.pdf', fileSize: '1.2 MB' },
      { id: 3, title: 'Nghị quyết của chi đoàn cơ sở', isRequired: true, status: 'ok', fileName: 'Nghi_quyet_Chi_doan.pdf', fileSize: '800 KB' },
      { id: 4, title: 'Bảng điểm rèn luyện năm học', isRequired: true, status: 'ok', fileName: 'DRL_LeThuHa.pdf', fileSize: '650 KB' },
      { id: 5, title: 'Bảng điểm tích luỹ học tập', isRequired: true, status: 'ok', fileName: 'Diem_hoc_tap.pdf', fileSize: '700 KB' },
      { id: 6, title: 'Giấy chứng nhận bồi dưỡng đảng viên mới', isRequired: true, status: 'ok', fileName: 'GCN_Dang_vien_moi.pdf', fileSize: '950 KB' },
      { id: 7, title: 'Ảnh chân dung 3x4', isRequired: true, status: 'ok', fileName: 'Anh_LeThuHa.jpg', fileSize: '310 KB' },
    ],
    history: [
      { id: 1, date: '07/10/2026 08:30', actor: 'LCĐ Khoa Điện', action: 'Thông qua cấp LCĐ, chuyển Ban TCKT' },
      { id: 2, date: '25/09/2026 14:00', actor: 'Lê Thu Hà', action: 'Nộp hồ sơ chuyển Đảng chính thức' },
    ],
  },
  {
    id: 4,
    code: 'HS-2026-004',
    fullName: 'Phạm Đức Duy',
    studentId: '20219034',
    birthDate: '12/09/2003',
    className: 'CoKhi-02 K66',
    unit: 'LCĐ Khoa Cơ khí',
    caseType: 'Kết nạp',
    status: 'eligible',
    statusLabel: 'Đủ điều kiện họp xét',
    submittedDate: '15/09/2026',
    updatedDate: '04/10/2026',
    daysInStatus: 4,
    slaDays: 30,
    completedDocs: 7,
    totalDocs: 7,
    documents: [],
    history: [],
  },
  {
    id: 5,
    code: 'HS-2026-005',
    fullName: 'Hoàng Nam Sơn',
    studentId: '20207765',
    birthDate: '18/02/2002',
    className: 'Dien-01 K65',
    unit: 'LCĐ Khoa Điện',
    caseType: 'Chuyển chính thức',
    status: 'vp_checking',
    statusLabel: 'VP Đoàn rà soát',
    submittedDate: '10/09/2026',
    updatedDate: '05/10/2026',
    daysInStatus: 3,
    slaDays: 10,
    completedDocs: 7,
    totalDocs: 7,
    documents: [],
    history: [],
  },
  {
    id: 6,
    code: 'HS-2026-006',
    fullName: 'Đỗ Thanh Mai',
    studentId: '20216698',
    birthDate: '30/08/2003',
    className: 'Hoa-01 K66',
    unit: 'LCĐ Khoa Hoá',
    caseType: 'Kết nạp',
    status: 'forwarded',
    statusLabel: 'Đã chuyển Chi bộ',
    submittedDate: '01/09/2026',
    updatedDate: '07/10/2026',
    daysInStatus: 1,
    slaDays: 0,
    completedDocs: 7,
    totalDocs: 7,
    documents: [],
    history: [],
  },
  {
    id: 7,
    code: 'HS-2026-007',
    fullName: 'Bùi Gia Huy',
    studentId: '20203310',
    birthDate: '04/04/2002',
    className: 'CoKhi-01 K65',
    unit: 'LCĐ Khoa Cơ khí',
    caseType: 'Kết nạp',
    status: 'cancelled',
    statusLabel: 'Đã huỷ',
    submittedDate: '18/08/2026',
    updatedDate: '24/09/2026',
    daysInStatus: 14,
    slaDays: 0,
    completedDocs: 7,
    totalDocs: 7,
    documents: [],
    history: [],
  },
];

export const CTD_KPIS = [
  { label: 'Hồ sơ trong đợt', value: '184', note: '62 kết nạp · 122 chuyển chính thức', tone: 'neutral' },
  { label: 'Đang chờ xử lý', value: '57', note: 'ở 4 cấp duyệt theo quy định', tone: 'info' },
  { label: 'Quá hạn SLA 7 ngày', value: '23', note: 'Tập trung chủ yếu tại cấp LCĐ', tone: 'warn' },
  { label: 'Thời gian TB hoàn tất', value: '26', note: 'ngày từ khi nộp đến chuyển Chi bộ', tone: 'success' },
];

export const CTD_STAGE_DISTRIBUTION = [
  { label: 'Chờ LCĐ kiểm tra', count: 31, percentage: 17, color: '#FFAB00' },
  { label: 'Đủ điều kiện họp xét', count: 18, percentage: 10, color: '#0052CC' },
  { label: 'Ban TCKT kiểm tra', count: 8, percentage: 4, color: '#4C9AFF' },
  { label: 'VP Đoàn rà soát', count: 14, percentage: 8, color: '#6554C0' },
  { label: 'Đã chuyển Chi bộ', count: 113, percentage: 61, color: '#36B37E' },
];

export const CTD_BACKLOG_ITEMS = [
  { name: 'Vũ Khánh Linh', mssv: '20211123', unit: 'LCĐ Khoa CNTT', status: 'Cần bổ sung', daysOverdue: 12 },
  { name: 'Nguyễn Minh Anh', mssv: '20215412', unit: 'LCĐ Khoa CNTT', status: 'Chờ LCĐ kiểm tra', daysOverdue: 9 },
  { name: 'Bùi Gia Huy', mssv: '20203310', unit: 'LCĐ Khoa Cơ khí', status: 'Ban TCKT kiểm tra', daysOverdue: 6 },
  { name: 'Ngô Hải Yến', mssv: '20214321', unit: 'LCĐ Khoa Kinh tế', status: 'VP Đoàn rà soát', daysOverdue: 6 },
  { name: 'Lý Tuấn Kiệt', mssv: '20208832', unit: 'LCĐ Khoa CNTT', status: 'Chờ LCĐ kiểm tra', daysOverdue: 5 },
];
