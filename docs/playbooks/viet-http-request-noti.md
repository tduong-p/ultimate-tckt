---
doc_id: PB-NOTI-001
title: Playbook — viết mẫu HTTP request gọi Noti cho từng use case
version: 1.0
status: draft
audience: [dev, ai]
owner: DYC
updated: 2026-10-02
related_code: [docs/specs/2026-10-02-noti-service-design.md]
---

# Playbook — viết mẫu HTTP request gọi Noti cho từng use case

Dành cho người được giao viết **một mẫu request cho mỗi use case (UC) gửi thông báo**. Hợp đồng đầy đủ nằm ở
`docs/specs/2026-10-02-noti-service-design.md` (SPEC-NOTI-001, §5 API, §8 dedupe, §9 template) — tài liệu này chỉ
là cách làm. Noti đang ở trạng thái bản nháp: nếu spec đổi, mẫu phải đổi theo.

## 1. Mỗi UC cho ra gì

Một mục theo khuôn dưới đây, gồm: **tên UC, điểm gọi trong Core, request mẫu, giải thích từng trường, quy tắc `dedupe_key`, các tình huống lỗi**. Một UC tương ứng đúng một `template` (danh sách ở SPEC-NOTI-001 §9).

## 2. Khung request

```http
POST /v1/notifications HTTP/1.1
Host: noti-api:8000
Authorization: Bearer <API_KEY_CUA_SERVICE_GOI>
Content-Type: application/json

{
  "template": "task.assigned",
  "recipients": [{ "email": "an@hust.edu.vn", "name": "Nguyễn Văn An" }],
  "data": {
    "actor": "Bình",
    "task": { "id": 120, "title": "Làm poster", "path": "/#activity/3", "deadline": "2026-10-10T17:00:00+07:00" },
    "activity": { "title": "Hội trại 2026" }
  },
  "dedupe_key": "task-assigned:120:7"
}
```

- **Key:** luôn ghi `<API_KEY_CUA_SERVICE_GOI>`, **không bao giờ** điền key thật hay email người thật vào tài liệu.
- Email trong mẫu dùng địa chỉ giả (`an@example.com`), tên tiếng Việt có dấu.
- Trường tuỳ chọn: `cc`, `reply_to`, `priority` (`high|normal|low`), `expires_at`, `source_ref`, `recipients[].variables`.

## 3. Quy tắc viết `data`

1. Lấy danh sách biến từ `GET /v1/templates` (hoặc `meta.yaml` của template): chỉ dùng biến trong `required` và `optional`. Biến thừa bị Noti bỏ.
2. Ngôn ngữ tiếng Việt; ngày giờ dùng **ISO 8601 kèm múi giờ** (`+07:00`), Noti tự định dạng.
3. Liên kết chỉ là **đường dẫn tương đối** (`/#activity/3`), không URL tuyệt đối.
4. Không nhét dữ liệu nhạy cảm không cần thiết (mật khẩu, token, nội dung riêng tư dài). Văn bản người dùng nhập (bình luận, phản hồi) được phép nhưng sẽ bị escape khi render.
5. Nguồn dữ liệu của từng biến: ghi rõ lấy từ cột/biến nào tại điểm gọi (xem bảng sự kiện ở `docs/specs/2026-10-02-go-email-cu-plan.md`, Task 2). Chỗ nào dữ liệu còn thiếu, ghi **"thiếu"** thay vì tự bịa.

## 4. Quy tắc `dedupe_key`

- Dựng từ định danh nghiệp vụ: `<sự-kiện>:<id>:<người-nhận>[:<yếu-tố-lặp>]`.
- Cùng sự kiện gửi lại (gọi lặp, retry mạng) → cùng key. Sự kiện được phép lặp hợp lệ (nhắc hạn mỗi ngày) → thêm ngày hoặc số lần vào key.
- Với UC đã có `source_key` trong bảng `notifications` của Core, dùng đúng chuỗi đó.
- Mỗi mẫu phải trả lời được: **"hai lần gọi giống hệt nhau thì sao? gọi lại sau một ngày thì sao?"**

## 5. Kết quả cần mô tả cho mỗi UC

| Tình huống | Mã | Ghi trong mẫu |
|---|---|---|
| Tạo mới | `202` + `{id,status}` | response mẫu |
| Gọi lại cùng key, cùng nội dung | `200` | nêu rõ là không gửi thêm thư |
| Cùng key, nội dung khác | `409` | khi nào xảy ra ở UC này |
| Thiếu biến / template sai / quá giới hạn | `400` | một ví dụ thiếu biến bắt buộc |
| Key sai hoặc bị thu hồi | `401` | — |

## 6. Khuôn một mục UC

```markdown
### UC-xx — <tên>
- Template: `task.assigned`
- Điểm gọi: `core/src/routes/activities.js` (giao việc)
- Người nhận: <ai nhận, lấy từ đâu, một hay nhiều người>
- Request mẫu: (khối http như §2)
- Nguồn từng biến: | biến | lấy từ | ghi chú |
- `dedupe_key`: <công thức> — gọi lặp: <hành vi>
- Response mẫu: 202 / 200 / 409 / 400
- Điểm cần hỏi lại: <dữ liệu thiếu, giả định chưa chắc>
```

## 7. Kiểm tra trước khi giao lại

- [ ] Mỗi UC có đúng một template và nằm trong danh sách SPEC-NOTI-001 §9 (cần template mới thì ghi vào "Điểm cần hỏi lại", không tự đặt).
- [ ] Mọi biến `required` đều có mặt; không có biến ngoài `required`/`optional`.
- [ ] Không có key, email hay dữ liệu thật.
- [ ] `dedupe_key` có công thức, và có nêu hành vi khi gọi lặp.
- [ ] Các điểm không chắc được liệt kê ở "Điểm cần hỏi lại".

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-02 | Bản đầu | DYC |
