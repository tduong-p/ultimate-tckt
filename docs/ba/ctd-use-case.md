---
doc_id: BA-CTD-001
title: Use case Công tác Đảng (CTD)
version: 1.0
status: active
audience: [ba]
owner: DYC
updated: 2026-09-24
related_code: [services/ctd-api/backend/app/api/cases.py, services/ctd-api/backend/app/api/documents.py, services/ctd-api/backend/app/api/auth.py, services/ctd-api/backend/app/seeds/workflow_seed.py]
---

# Use case Công tác Đảng (CTD)

Tài liệu này mô tả quy trình xét duyệt hồ sơ kết nạp/chuyển Đảng — module CTD, một dịch vụ backend riêng (FastAPI + PostgreSQL). Nội dung được đối chiếu trực tiếp với `app/api/cases.py`, `app/api/documents.py`, `app/seeds/workflow_seed.py` — **đây là trạng thái đã hiện thực (đã làm), không phải chỉ là thiết kế**. Tài liệu cũ (`boi-canh-du-an.md`, `PHAN-TICH-KHOANG-CACH.md`) mô tả một MVP cũ hơn (state machine 7 trạng thái, chỉ lưu link Drive) — bản dưới đây đã vượt qua giai đoạn đó.

## 1. Mục đích

Số hoá quy trình xét duyệt hồ sơ Đảng từ lúc sinh viên nộp đến khi chuyển Chi bộ: khắc phục vấn đề timeout của quy trình cũ chạy trên Power Automate (mỗi hồ sơ một flow, hết hạn sau 30 ngày dù hồ sơ Đảng thường kéo dài nhiều tháng), minh bạch và truy vết được toàn bộ lịch sử xử lý.

## 2. Vai trò và phạm vi xem — đã làm

Nguồn: `app/services/scope.py` (hàm `visible_cases`).

| Vai trò CTD | Thấy hồ sơ nào |
|---|---|
| `sinh_vien` | chỉ hồ sơ của chính mình |
| `can_bo_don_vi` (ĐT/LCĐ) | hồ sơ thuộc đúng đơn vị mình, trừ hồ sơ còn `draft` (chưa nộp) |
| `tckt` | toàn trường (trừ `draft`) |
| `vp_doan` | toàn trường (trừ `draft`) |
| `chi_bo` | chỉ hồ sơ đã ở trạng thái `forwarded` (đã chuyển đến) |
| `quan_tri` (DYC) | tất cả, không giới hạn |

## 3. Vòng đời hồ sơ — đã làm (9 trạng thái)

| Mã trạng thái | Nhãn | Ai giữ hồ sơ | SLA |
|---|---|---|---|
| `draft` | Nháp | Sinh viên | — |
| `dt_checking` | ĐT/LCĐ đang kiểm tra | Cán bộ đơn vị | 7 ngày |
| `need_supplement` | Chờ sinh viên bổ sung | Sinh viên | 2 ngày |
| `tckt_checking` | Ban TCKT kiểm tra | Ban TCKT | 5 ngày |
| `eligible` | Đủ điều kiện họp xét | Cán bộ đơn vị | 30 ngày |
| `meeting_scheduled` | Chờ họp xét | Cán bộ đơn vị | — |
| `vp_checking` | VP Đoàn rà soát | VP Đoàn | 10 ngày |
| `forwarded` | Đã chuyển Chi bộ (kết thúc) | — | — |
| `cancelled` | Đã huỷ (kết thúc) | — | — |

**Thứ tự đã chốt:** đơn vị kiểm tra → thông qua thì gửi Ban TCKT → TCKT đạt mới tổ chức họp xét cấp đơn vị → VP Đoàn rà soát → chuyển Chi bộ. Đây là điểm khác biệt lớn nhất so với MVP cũ (đơn vị → VP Đoàn → Chi bộ, không có bước TCKT kiểm tra hay họp xét).

Các bước chuyển chính (`app/seeds/workflow_seed.py`): sinh viên gửi hồ sơ (`submit`), cán bộ đơn vị yêu cầu bổ sung hoặc thông qua gửi TCKT, sinh viên nộp lại, TCKT đạt/không đạt, cán bộ đơn vị đưa vào họp/gỡ khỏi họp/thông qua họp/không thông qua, VP Đoàn trả về hoặc duyệt chuyển Chi bộ. Bốn nhánh "không đạt" đều bắt buộc lý do và đưa hồ sơ về đúng một bước trước đó. Huỷ hồ sơ áp dụng cho mọi trạng thái chưa kết thúc (kể cả `draft`), không xoá dữ liệu — chỉ đổi trạng thái, log vẫn giữ nguyên.

Danh sách hành động khả dụng cho từng hồ sơ luôn được server tính (`available_actions`) — giao diện dựng nút từ đó, không tự suy luận theo trạng thái.

## 4. Ba lớp bảo vệ — đã làm

1. **Không ai duyệt hồ sơ của chính mình**, kể cả khi vai trò và đơn vị đều đúng — kiểm tra trước mọi luật khác (`app/services/workflow.py::duoc_phep`).
2. **Khoá dòng khi chuyển trạng thái** (`SELECT … FOR UPDATE`) chống hai cán bộ bấm hành động cùng lúc trên một hồ sơ.
3. **Danh sách trắng theo `transition_def.allowed_roles`** — không có vai trò nào (kể cả `quan_tri`) được đặc cách vượt qua danh sách whitelist; quyền của quản trị viên cũng do dữ liệu quyết định như mọi vai trò khác.

## 5. Nộp và kiểm tra giấy tờ — đã làm

Trái với ghi nhận cũ "hệ thống không lưu file, chỉ lưu link Drive" (`boi-canh-du-an.md` §9), **hệ thống hiện tại có lưu file thật** qua endpoint tải lên (`POST /api/documents/{document_id}/file`, `app/infra/storage.py`), cộng cơ chế lấy URL có chữ ký để tải xuống (`GET /api/documents/{document_id}/url`). Mỗi mục giấy tờ là một bản ghi `Document` riêng (loại giấy tờ, file, trạng thái hợp lệ, lý do) chứ không phải một link chung cho cả hồ sơ:

- `POST /api/documents/{document_id}/verdict` — cán bộ đánh giá đạt/không đạt kèm lý do cho từng giấy tờ.
- `POST /api/documents/{document_id}/not-applicable` — đánh dấu "không áp dụng" cho giấy tờ được phép (vd sinh viên năm 1 chưa có bảng điểm kỳ 2).
- `POST /api/cases/{case_id}/documents` — cán bộ thêm đầu mục giấy tờ phát sinh riêng cho một hồ sơ, không đụng danh mục chuẩn.

Danh mục giấy tờ hiện hành được **chụp ảnh (snapshot)** thành các dòng tài liệu của hồ sơ ngay khi hồ sơ được tạo — sửa/xoá danh mục sau đó không ảnh hưởng hồ sơ đang chạy, chỉ áp dụng cho hồ sơ tạo mới. Chi tiết danh mục: xem [`danh-muc-giay-to-ctd.md`](danh-muc-giay-to-ctd.md).

## 6. Đăng nhập — đã làm

`app/api/auth.py`: xác thực bằng **mật khẩu HOẶC mã OTP gửi qua email** (`POST /api/auth/verify`), không phải chỉ SSO Microsoft như tài liệu use case Sinh viên cũ mô tả. Endpoint `request-code` luôn trả `204` dù email không tồn tại, tránh lộ danh sách người dùng.

## 7. Tích hợp vào cổng chung — kế hoạch, chưa có code

Theo `.kiro/specs/nen-tang-da-don-vi/requirements.md` Yêu cầu 8: CTD sẽ được truy cập qua cổng chung bằng JWT bridge do Core ký (HS256, secret `HUB_BRIDGE_SECRET` riêng biệt với `CTD_JWT_SECRET` hiện tại, TTL 60 giây, claim gồm user/đơn vị đang chọn/role). CTD sẽ tìm/tạo `app_user` theo `hub_user_id` khi nhận token hợp lệ. **Hiện tại CTD vẫn có luồng đăng nhập độc lập riêng** (mục 6) — cầu nối JWT bridge chưa tồn tại trong code.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
