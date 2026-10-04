---
doc_id: SPEC-MAIL-001
title: Thiết kế bật email thật trên production (Core → Noti) — Đợt 2
version: 1.3
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-05
related_code: [infra/compose/docker-compose.production.yml, core/src/noti-sender.js]
---

# Bật email thật trên production — thiết kế

> Việc **liên module** (infra, env, Core ↔ Noti). Theo `AGENTS.md` §3 và `docs/dev/ranh-gioi-module.md`, chưa ai code phần infra/env cho tới khi
> issue liên module tương ứng có quyết định. Quyết định (2026-10-05, người phụ trách dự án, ghi trong #63): không cần họp team; production dùng SMTP M365 như staging; chuyển sang Graph làm sau ở #68. Plan: `PLAN-MAIL-001` (`docs/specs/2026-10-04-mail-production-plan.md`).

## 1. Bối cảnh và hiện trạng (kiểm tra trên VM ngày 2026-10-04)

Đợt 1 (SPEC-REL-001) phát hành lên production **không có email thật**, theo quyết định bằng văn bản ngày 2026-10-03 trong issue #49
(Phan Tuan Duong): *"Chưa bật gửi email Noti thật trên Production đợt 1"* và *"mọi lỗi gửi sai người, gửi lặp hoặc mất thư phải được xử lý triệt để và nghiệm thu
trước khi bật cấu hình gửi email thật trên production"*.

| Thành phần | Staging | Production |
|---|---|---|
| Service Noti (`noti-api`, `noti-worker`) | Chạy (`NOTI_MAIL_DRIVER=smtp`) | Đã thêm vào compose (PLAN-MAIL-001 Task 4, nhánh `feat/infra-noti-production`); lúc viết spec: **không có** trong `docker-compose.production.yml`; không có container |
| `NOTI_URL`, `NOTI_API_KEY` của Core | Có | **Không có** → `notiSenderFromEnv` trả `null`, Core không gửi gì |
| Giới hạn người nhận `NOTI_RECIPIENT_ALLOWLIST` | Một địa chỉ test | Chưa có (Noti chưa tồn tại) |
| `deploy-noti` trong CI | Chạy | **Chặn cứng** (`needs.changes.outputs.env == 'staging'`) |
| Cổng Noti trong `infra/scripts/lib.sh` | `staging:noti 8100` | Không có (`ut_app_port` báo lỗi nếu gọi `production noti`) |
| Email của CTD (`MAILER_DRIVER`) | `console` | `console` (đường riêng, xem §3) |
| Chuông thông báo trong app | Chạy | Chạy (không phụ thuộc Noti) |

Hệ quả: bộ nhắc hạn của Core vẫn chạy trên production mỗi 15 phút nhưng `notifier` chỉ ghi log mức `info` (đã chấp nhận ở SPEC-REL-001, R12).

Tài khoản người dùng production hiện là **65 người thật** (dữ liệu ngày 2026-10-03). Địa chỉ email của họ đã nằm trong bản dump công khai (issue #55) nên
thư gửi nhầm hoặc thư lạ có rủi ro **lừa đảo (phishing)** cao hơn bình thường: người nhận không có cách phân biệt thư thật và thư giả mạo ngoài địa chỉ gửi.

## 2. Mục tiêu và ngoài phạm vi

**Mục tiêu.** Core gửi thông báo sự kiện và nhắc hạn bằng email thật tới người dùng production qua Noti, **đúng người, đúng giờ, không trùng, không mất**, và
có cách tắt/rollback trong vài phút.

**Trong phạm vi.**
1. Chạy Noti trên production (cùng image, cùng compose mô hình với staging) và nối Core vào.
2. Cổng nghiệm thu bắt buộc trước khi gửi thật (§4), gồm toàn bộ #49.
3. Triển khai theo ba pha có kiểm soát người nhận (§5).
4. Quan sát, cảnh báo, sao lưu, rollback (§7).

**Ngoài phạm vi.**
- Email của CTD (module Công tác Đảng; `MAILER_DRIVER` riêng, issue #51). Giữ `console`.
- Thông báo push/web, digest, tuỳ chọn nhận mail theo người dùng (SPEC-NOTI-001 §14).
- Đổi hợp đồng API Noti v1.
- Xoá dump khỏi lịch sử git (#55; đã quyết định không làm).

## 3. Quyết định thiết kế

| # | Quyết định | Lý do |
|---|---|---|
| D1 | Noti trên production là **cùng mô hình với staging**: một image, hai service `noti-api` + `noti-worker`, database `noti` riêng trên `ctd-db` **của production**, không có nginx/domain, chỉ mở `127.0.0.1:8101` cho health (staging đã giữ 8100 trên cùng VM; `lib.sh` thêm `production:noti 8101`). | Đã chạy ổn trên staging; không thêm hạ tầng mới. Noti không được lộ ra internet (SPEC-NOTI-001 §11). |
| D2 | Việc làm tay trên VM **trước khi** merge thay đổi compose: tạo role + database `noti`, đặt `NOTI_DB_*` trong `.env` production. | Compose dùng `${NOTI_DB_USER:?}`; thiếu biến thì **mọi** lệnh compose của production (kể cả deploy Core) lỗi. Thứ tự là bắt buộc. |
| D3 | Deploy Noti lên production bật bằng **biến repo `PROD_NOTI_ENABLED`** (mặc định không đặt = tắt), giống cách `PROD_DEPLOY_ENABLED` đang làm. | Công tắc rõ ràng, tắt được mà không sửa workflow. Thay cho điều kiện cứng `env == 'staging'`. |
| D4 | Core production nhận `NOTI_URL=http://noti-api:8000` (cố định trong compose) và `NOTI_API_KEY=${CORE_NOTI_API_KEY:-}`. **Key trống = Core không gửi** (hành vi hiện tại, giữ nguyên). | Đây là **công tắc tắt khẩn cấp**: xoá `CORE_NOTI_API_KEY`, chạy lại apply-infra, Core ngừng gửi mà vẫn chạy. |
| D5 | Production dùng client key riêng (`core`) do `python -m noti.cli create-client core` sinh **trên production**. Không dùng lại key staging. | Mỗi môi trường một key; thu hồi độc lập. |
| D6 | Driver gửi thật là `smtp` (M365, `smtp.office365.com:587`, STARTTLS có kiểm chứng chứng chỉ) bằng **tài khoản dịch vụ riêng**, giống staging. Chuyển sang `graph` (quyền `Mail.Send` giới hạn một hộp thư) làm sau, theo issue #68. | Quyết định 2026-10-05: staging đã chạy ổn bằng SMTP; xin quyền Graph cần IT nên không chặn đợt này. Đổi lại quyền của tài khoản SMTP rộng hơn Graph, và Microsoft có thể tắt basic auth SMTP (rủi ro ghi bên dưới). |
| D7 | Ba pha rollout theo `NOTI_RECIPIENT_ALLOWLIST` (§5). Pha sau chỉ bắt đầu khi pha trước đạt tiêu chí. | Nhân sự: không gửi cho 65 người thật khi chưa có bằng chứng trên một nhóm nhỏ. |
| D8 | Production **luôn** có `NOTI_RECIPIENT_ALLOWLIST` khác rỗng trong pha A và B. Chỉ pha C mới được đặt miền `hust.edu.vn`. Allowlist **rỗng không bao giờ** được phép trên production. Compose production dùng `${NOTI_RECIPIENT_ALLOWLIST:?}` nên thiếu hoặc rỗng thì compose từ chối chạy (có test). | Allowlist rỗng nghĩa là gửi cho mọi người (SPEC-NOTI-001 §10). |

## 4. Cổng nghiệm thu bắt buộc trước khi gửi thật (M1–M6)

Không pha nào có gửi thật (A trở đi) được bắt đầu khi còn cổng đỏ.

| Cổng | Điều kiện | Bằng chứng | Chủ |
|---|---|---|---|
| **M1** | Mọi mục 1–9 phần "Core → Noti" của #49 đã sửa và có test đỏ→xanh: cửa sổ nhắc hạn giờ VN, loại `review`, không gửi cho chính người thao tác, lọc `is_active`, đủ người nghiệm thu, kiểm định dạng email, retry lỗi tạm thời, key/link/feedback, dữ liệu template. | PR đã merge vào `main`, CI xanh, danh sách tick từng mục trong issue #49. **Trạng thái từng mục phải được kiểm lại tại thời điểm làm** — spec này chưa kiểm kê. | TCKT (Điều hành) + DYC (Noti) |
| **M2** | Mọi mục "Bên trong Noti" của #49 đã sửa: SMTP/Graph xác thực TLS, phân loại lỗi tạm thời so với vĩnh viễn (MSAL, Graph 401, SMTP 535), timeout MSAL và khoá/`LOCK_SECONDS`, `/retry` sau purge, thư bị allowlist loại không được ghi `sent`, `reply_to` qua allowlist, giới hạn body, backoff. | Như M1. | DYC (Noti) |
| **M3** | Tài khoản SMTP dịch vụ **chỉ dùng cho hệ thống này**, không phải hộp thư cá nhân; có người chịu trách nhiệm mật khẩu và lịch xoay vòng ≤ 12 tháng; mật khẩu chỉ nằm trong `.env` trên VM. | Người vận hành xác nhận trong issue (không dán mật khẩu); thử gửi bằng driver `smtp` tới địa chỉ trong allowlist. | Trưởng nhóm |
| **M4** | Hạ tầng production sẵn sàng (Task 1–5 của plan) và smoke ở pha A xanh. | `docs/ops/moi-truong.md` mục Noti production; health `/v1/health` 200. | DYC (infra) |
| **M5** | Quan sát/cảnh báo: có cách biết `pending` quá 15 phút hoặc `failed` tăng; database `noti` nằm trong lịch backup. | Lệnh kiểm trong plan Task 8; file backup có `noti`. | DYC (infra) |
| **M6** | Rollback đã diễn tập một lần ở pha A (tắt bằng cách xoá key, bật lại). | Ghi vào comment issue với thời điểm và kết quả. | DYC (infra) |

## 5. Ba pha rollout

| Pha | `NOTI_MAIL_DRIVER` | `NOTI_RECIPIENT_ALLOWLIST` | Ai nhận | Tiêu chí qua pha |
|---|---|---|---|---|
| **A — quan sát** | `console` | bất kỳ (không gửi thật) | không ai; email hiện trong log `noti-worker` | ≥ 3 ngày làm việc: người nhận trong log đúng người; không trùng `dedupe_key`; không thư gửi lúc nửa đêm giờ VN; `failed` = 0. |
| **B — thử nhóm nhỏ** | `smtp` | danh sách địa chỉ cụ thể (3–5 người trong nhóm DYC/TCKT) + `NOTI_REDIRECT_TO` là hộp thư của người phụ trách | nhóm nhỏ; thư tới địa chỉ ngoài danh sách chuyển về `NOTI_REDIRECT_TO` | ≥ 5 ngày làm việc: không thư sai người, không thư lặp, người nhận xác nhận nội dung/giờ đúng; không lỗi SMTP (đặc biệt 535/530 xác thực). |
| **C — toàn bộ** | `smtp` | `hust.edu.vn` | mọi người dùng | Mở khi pha B đạt **và** Trưởng nhóm duyệt bằng văn bản trong issue. |

Mọi chuyển pha là một thay đổi `.env` production + `apply-infra.sh`, được ghi lại bằng comment trong issue (ngày, người làm, giá trị allowlist **không có secret**).

## 6. Hợp đồng và thay đổi

Hợp đồng dùng chung bị chạm: **env** (`NOTI_*`, `CORE_NOTI_API_KEY`), **compose/infra** (`docker-compose.production.yml`, `lib.sh`, `deploy.yml`,
`apply-infra.sh`). Hợp đồng API Noti v1 **không đổi**. Không đổi schema Core.

Tài liệu phải cập nhật trong cùng các PR: `docs/ops/moi-truong.md`, `docs/ops/deploy-va-nhanh.md`, `docs/dev/noti.md`, `docs/dev/email-cron.md`,
`docs/ai/bay-da-gap.md`, `SPEC-REL-001` (dòng nói production chưa có Noti), `docs/dev/ranh-gioi-module.md` nếu đổi ranh giới.

## 7. Rủi ro, giám sát, rollback

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Thư gửi **sai người / lặp / lúc nửa đêm** tới người dùng thật | Cao | M1 + M2 là cổng cứng; pha A chỉ quan sát log; pha B nhóm nhỏ. |
| **Allowlist rỗng** làm gửi cho mọi người | Cao | D8; Task 6 kiểm tự động trước mỗi lần deploy Noti production. |
| Thư lừa đảo giả mạo (email của 65 người đã công khai) | Trung bình | Địa chỉ gửi cố định, SPF/DKIM/DMARC do IT trường quản; thông báo cho người dùng địa chỉ gửi chính thức trước pha C. |
| Tài khoản SMTP có quyền rộng; Microsoft tắt basic auth SMTP | Trung bình | Dùng tài khoản dịch vụ riêng, mật khẩu chỉ ở `.env`; lỗi xác thực 530/534/535 được Noti coi là lỗi tạm thời (thư tồn đọng, gửi lại sau khi sửa); chuyển Graph ở #68. |
| Secret Graph/SMTP hoặc `CORE_NOTI_API_KEY` lộ | Cao | Chỉ qua `.env` trên VM; không vào repo/log/PR; xoay vòng ≤ 12 tháng; xem `docs/ops/moi-truong.md` mục 4a cách xoay key. |
| Migration `noti` hoặc tạo database lỗi trên `ctd-db` production | Trung bình | Role/database riêng cho Noti, không đụng database CTD; backup `ctd-db` trước khi tạo. |
| Thiếu `NOTI_DB_*` làm hỏng mọi lệnh compose production | Cao | D2: đặt biến **trước** khi merge compose; Task 2 kiểm bằng `docker compose config`. |

**Giám sát tối thiểu** (SPEC-NOTI-001 §12): số `pending`, số `failed`, tuổi `pending` lâu nhất; cảnh báo khi tuổi `pending` > 15 phút hoặc `failed` tăng. Cách phát cảnh báo do infra chọn; tối thiểu là một lệnh kiểm tay có trong runbook và chạy hằng ngày ở pha A và B.

**Rollback (nhanh nhất trước):**
1. **Tắt gửi ngay:** xoá giá trị `CORE_NOTI_API_KEY` trong `.env` production, chạy lại `apply-infra.sh production`. Core vẫn chạy, ngừng gửi. (~1 phút)
2. **Về console:** đặt `NOTI_MAIL_DRIVER=console`, `deploy.sh production noti <tag đang chạy>`. Thư vẫn xếp hàng nhưng chỉ ghi log.
3. **Gỡ Noti:** đặt biến repo `PROD_NOTI_ENABLED` về rỗng và dừng `noti-api`/`noti-worker`. Dữ liệu database `noti` giữ nguyên, không ảnh hưởng Core.

## 8. Tiêu chí hoàn thành

1. M1–M6 đều có bằng chứng và được tick trong issue.
2. Pha A, B đạt tiêu chí ở §5; pha C được duyệt bằng văn bản.
3. Ở pha C, kiểm tra sau 24 giờ: không `failed` lặp, không khiếu nại thư sai người.
4. Tài liệu ở §6 đã cập nhật và `npm run docs:check -- --base origin/main` xanh.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.3 | 2026-10-05 | Đồng bộ với code hạ tầng Noti production (PR hạ tầng) | DYC |
| 1.2 | 2026-10-05 | Production dùng SMTP như staging (D6, M3, pha B/C); không cần họp team; Graph để sau (#68) | DYC |
| 1.1 | 2026-10-04 | Làm rõ: cổng host 8101 (tránh xung đột staging 8100), allowlist bắt buộc ở cấp compose | DYC |
| 1.0 | 2026-10-04 | Bản đầu: hiện trạng production, cổng M1–M6, ba pha rollout, rollback | DYC |
| 1.2 | 2026-10-05 | Ghi nhận compose production đã có Noti (Task 4) | DYC |
