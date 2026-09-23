---
doc_id: BA-DOC-001
title: Danh mục giấy tờ hồ sơ Đảng
version: 1.0
status: active
audience: [ba]
owner: DYC
updated: 2026-09-24
related_code: [services/ctd-api/backend/app/seeds/catalog_seed.py]
---

# Danh mục giấy tờ hồ sơ Đảng

Tài liệu này giúp BA và cán bộ nghiệp vụ nắm danh mục giấy tờ hiện đang được dùng để khởi tạo hồ sơ trong CTD, và các câu hỏi khảo sát còn treo trước khi danh mục này được coi là chính thức.

## 1. Vì sao danh mục nằm ngoài code

Danh mục giấy tờ là một bảng dữ liệu (`document_type`) do quản trị viên khai báo, không phải hằng số cứng trong code — đổi quy định (thêm/bớt loại giấy tờ) không cần sửa phần mềm. Khi tạo một hồ sơ mới, hệ thống **chụp ảnh danh mục hiện hành** thành các dòng tài liệu riêng của hồ sơ đó; sửa/xoá danh mục sau đó không ảnh hưởng hồ sơ đang chạy — chỉ áp dụng cho hồ sơ tạo mới. Cán bộ được phép thêm đầu mục giấy tờ phát sinh riêng cho một hồ sơ cụ thể (không đụng danh mục chuẩn); sinh viên không được tự thêm đầu mục, chỉ nộp file vào đầu mục có sẵn hoặc đánh "không áp dụng" kèm lý do với các mục được phép.

## 2. Danh mục hiện hành — hồ sơ kết nạp Đảng (dự thảo, đã seed vào hệ thống)

Nguồn: `services/ctd-api/backend/app/seeds/catalog_seed.py`. Đây là **danh mục dự thảo, chưa đối chiếu văn bản hướng dẫn chính thức của Đảng uỷ nhà trường** — dùng để hệ thống chạy thử, không phải kết luận nghiệp vụ cuối cùng.

| Mã | Tên giấy tờ | Áp dụng cho | Bắt buộc | Cho phép "không áp dụng" | Định dạng chấp nhận | Dung lượng tối đa |
|---|---|---|---|---|---|---|
| `don_xin_vao_dang` | Đơn xin vào Đảng | kết nạp | Có | Không | pdf, jpg, png | 5 MB |
| `ly_lich` | Lý lịch của người xin vào Đảng | kết nạp | Có | Không | pdf, jpg, png | 5 MB |
| `chung_nhan_boi_duong` | Giấy chứng nhận lớp bồi dưỡng nhận thức về Đảng | kết nạp | Có | Không | pdf, jpg, png | 5 MB |
| `bang_diem_ky1` | Bảng điểm học kỳ 1 | kết nạp | Có | Không | jpg, png, pdf | 5 MB |
| `bang_diem_ky2` | Bảng điểm học kỳ 2 | kết nạp | Có | **Có** (sinh viên năm 1 chưa có kỳ 2) | jpg, png, pdf | 5 MB |
| `xac_nhan_chi_hoi` | Xác nhận của chi hội sinh viên | kết nạp | Có | Không | pdf, jpg, png | 5 MB |
| `anh_3x4` | Ảnh 3x4 | kết nạp, chuyển chính thức | Có | Không | jpg, png | 5 MB |

Hồ sơ **chuyển Đảng chính thức** hiện chỉ dùng chung mục "Ảnh 3x4" — danh mục riêng cho loại hồ sơ này **chưa được khảo sát**, cần một buổi làm việc riêng với BA/cán bộ nghiệp vụ (dự kiến khác đáng kể: bản tự kiểm điểm của đảng viên dự bị, bản nhận xét của đảng viên hướng dẫn, nghị quyết đề nghị công nhận chính thức…).

## 3. Câu hỏi khảo sát còn mở (chưa chốt)

Trước khi coi danh mục ở mục 2 là chính thức, cần làm rõ với BA và cán bộ nghiệp vụ:

- Văn bản nào là nguồn chuẩn cho danh mục giấy tờ? Ai có thẩm quyền sửa nó?
- Danh mục có khác nhau giữa các LCĐ/Đoàn trường hay toàn trường dùng chung?
- Có giấy tờ nào phụ thuộc điều kiện không (chỉ bắt buộc khi GPA dưới ngưỡng, khi là sinh viên năm cuối, khi thuộc diện chính sách…)?
- Giấy tờ nào có mẫu cố định? Ai giữ bản mới nhất?
- Giấy tờ nào hệ thống có thể tự sinh từ dữ liệu đã có (danh sách trích ngang, bản nhận xét cấp LCĐ)?
- Cán bộ dựa vào tiêu chí nào để kết luận một giấy tờ "không đạt"?
- Giấy tờ bản cứng có còn phải nộp song song không?

Ngoài ra còn 10 trường hợp đặc biệt cần khảo sát tần suất thực tế (sinh viên chuyển trường/chuyển ngành, ngoại tỉnh, bảo lưu, học song bằng, đi nghĩa vụ quân sự, nộp lại ở đợt sau, sắp tốt nghiệp, yếu tố lý lịch cần xác minh thêm, giấy tờ có thời hạn hiệu lực) — xem đầy đủ ở tài liệu gốc `docs/ba/nguon/` (đối chiếu qua use case ĐT/LCĐ và Sinh viên), không lặp lại chi tiết ở đây vì phần lớn vẫn là câu hỏi chưa có câu trả lời từ BA, chưa phải kết luận đưa vào seed dữ liệu.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
