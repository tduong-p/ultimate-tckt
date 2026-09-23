# Tài liệu gốc từ các bên liên quan

Thư mục này chứa bản gốc do các bên liên quan cung cấp, chỉ đọc (read-only), không chỉnh sửa.

Không rõ ngày nhận cụ thể của từng file — toàn bộ được chuyển từ hai repo cũ (`tckt-activity-hub`, `ctd`)
sang monorepo `ultimate-tckt` khi gộp (2026-09-24). Người cung cấp: đội BA/CTD dự án trước đây
(giả định best-effort — chưa xác nhận lại với từng cá nhân, xem ghi chú ở cuối tài liệu tổng hợp task này).

## Danh sách file

### `stakeholders/`

| File | Nội dung |
|---|---|
| `[TCKT_CTT][Data][Data tu LCD_DT][LIÊN CHI ĐOÀN_ ĐOÀN TRƯỜNG][Version 1.0] 13_8_2026.docx` | Mô tả stakeholder cấp Đoàn trường/Liên chi đoàn: đặc điểm, 4 nhóm công việc, 4 nhóm vấn đề, đề xuất luồng trạng thái 8 bước, checklist hồ sơ, kho văn bản mẫu. |
| `[BA] Cấp Văn phòng Đoàn và Chi bộ [Version 1.0].docx` | Mô tả stakeholder cấp Văn phòng Đoàn và Chi bộ: vai trò "nút thắt cổ chai" của VP Đoàn, bước kiểm tra của Ban TCKT, quy trình thẩm tra lý lịch và họp Chi bộ. |

### `use-case/sinh-vien/`

| File | Nội dung |
|---|---|
| `[TCKT_CTT][UseCase][Sinh viên][1.0][Finished]_[19_8_2026].docx` | Use case Sinh viên: UC1 Đăng nhập, UC2 Gửi hồ sơ, UC3 Xem trạng thái, UC4 Sửa hồ sơ bị trả về. |

### `use-case/doan-truong-lien-chi-doan/doan-truong/`

| File | Nội dung |
|---|---|
| `TCKT_CTT_USE_CASE_ĐOÀN_TRƯỜNG_Version 3_19_8_2026.docx` | Use case cán bộ Đoàn trường/Liên chi đoàn (v3): UC1 Đăng nhập, UC2 Tiếp nhận/tra cứu, UC3 Kiểm tra & yêu cầu bổ sung, UC4 Lên lịch họp, UC5 Trích xuất tài liệu họp, UC6 Cập nhật kết quả + biên bản, UC7 Gửi email kết quả, UC8 Thống kê/báo cáo. |

### `tai-lieu-goc/`

| File | Nội dung |
|---|---|
| `kickoff_meeting.docx` | Biên bản/ghi chú buổi kickoff dự án CTD. |
| `bao_cao_du_an.pdf` | Báo cáo dự án CTD (bản PDF gốc). |
| `danh_sach_thanh_vien.xlsx` | Mẫu bảng danh sách thành viên dự án (cột STT/Họ tên/MSSV/Email/Đơn vị/Lớp/Team/Ghi chú) — đã kiểm tra trực tiếp bằng cách mở file: **chỉ có dòng tiêu đề và số thứ tự (1–20), không có dữ liệu cá nhân thật nào được điền** (không có tên, MSSV, email, lớp thật). An toàn để lưu trữ nguyên trạng ở đây. |

### Gốc thư mục `nguon/`

| File | Nội dung |
|---|---|
| `DAC_TA_NGHIEP_VU_QUAN_LY_TO.docx` | Đặc tả nghiệp vụ quản lý Tổ (TCKT Activity Hub, hệ thống cũ). |
| `Tai_Lieu_Ky_Thuat.pdf` | Tài liệu kỹ thuật (TCKT Activity Hub, hệ thống cũ). |

## Quy ước

- Không sửa, không đổi tên file trong thư mục này. Cần bản cập nhật → xin bản mới từ bên cung cấp, đặt tên file mới, không ghi đè.
- Tài liệu BA/dev diễn giải nội dung các file này nằm ở `docs/ba/*.md` (thư mục cha) — luôn ưu tiên đối chiếu với code thật khi hai nguồn lệch nhau.
