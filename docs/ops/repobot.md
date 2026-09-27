---
doc_id: OPS-BOT-001
title: Vận hành bot Discord repobot
version: 1.1
status: active
audience: [ops, dev]
owner: DYC
updated: 2026-09-27
related_code: []
---

# Vận hành bot Discord repobot

Bot `repobot` trả lời câu hỏi về repo (`/ask`), soạn `docs/ba/**/*.md` thành PR vào `staging` (`/docs`) và đăng
thông báo thay đổi repo kèm TLDR vào một kênh (mục "Kênh thông báo"). Code ở
repo phụ `tduong-p/tckt-repobot`; thiết kế: `docs/specs/2026-09-26-ai-kit-repobot-design.md`; quyết định: issue
tduong-p/ultimate-tckt#20. Tài liệu này dành cho người vận hành VM.

## Bố trí

- User hệ thống `repobot` (không `sudo`, không `docker`), home `/srv/repobot`:
  `app/` (code bot, clone bằng deploy key chỉ đọc `~/.ssh/id_ed25519`), `main/` (clone repo chính),
  `read/` (worktree `origin/staging` cho hỏi đáp), `drafts/<thread>/` (worktree nhánh `bot/<thread>`),
  `notify/` (worktree detached cho `agy` đọc khi tóm tắt thông báo; file diff tạm ở `notify/.repobot-notify/`),
  `state.db`, `.env` và `github-app.pem` (quyền 600), `.local/node/` (Node 22), `.local/bin/agy`,
  `.gemini/` (phiên đăng nhập `agy`).
- Dịch vụ systemd `repobot` (`/etc/systemd/system/repobot.service`, bản gốc ở `deploy/` của repo phụ): chặn
  `/opt/ultimate-tckt`, `/opt/infra`, chỉ ghi được `/srv/repobot`, `MemoryMax=1G`, `CPUQuota=50%`, `TasksMax=256`.
- `agy` chạy headless, không bao giờ ghi file hay chạy lệnh; bot tự kiểm tra, ghi, commit, push `bot/*`, mở PR
  bằng GitHub App `tckt-repobot` (Contents + Pull requests, chỉ repo `ultimate-tckt`). Bot không merge.
- Bot tự `git fetch` repo chính mỗi 5 phút; PR luôn vào `staging`, nên bot đọc và sửa theo `origin/staging`.

## Kênh thông báo

Bot tự đăng khi: PR mở (không phải draft) hoặc merge vào `staging`/`main`; commit lên `staging`/`main` không thuộc PR
nào đã merge vào nhánh đó (kể cả force-push → tin "bị viết lại"); tuỳ chọn: push lên nhánh tính năng. Mỗi tin có
TLDR tiếng Việt viết từ diff, module bị chạm, cảnh báo khi tiêu đề/message mơ hồ, nút "Chi tiết" (trả lời chỉ người
bấm thấy). PR của repobot (`bot/*`) chỉ được một dòng ngắn, không TLDR.

Bật:

1. Tạo kênh văn bản (vd. `#repo-thay-doi`). Cho role của bot quyền **View Channel** và **Send Messages** ở kênh đó.
2. Bật Developer Mode trong Discord → chuột phải kênh → Copy Channel ID.
3. Thêm vào `/srv/repobot/.env`: `NOTIFY_CHANNEL_ID=<id>`; muốn có tin push nhánh tính năng thì thêm
   `NOTIFY_FEATURE_PUSH=true` (mặc định tắt).
4. `sudo systemctl restart repobot`.

Lần chạy đầu bot chỉ ghi nhận trạng thái hiện tại, **không đăng bù** lịch sử; bật `NOTIFY_FEATURE_PUSH` lần đầu cũng
vậy với các nhánh đang có. Tắt: xoá `NOTIFY_CHANNEL_ID` (hoặc `NOTIFY_FEATURE_PUSH`) khỏi `.env` rồi restart.

Tóm tắt dùng chung `agy` với `/ask`, `/docs` nhưng luôn nhường thread của người dùng chạy trước. `agy` lỗi (hết
quota 3 lần, hết giờ, hết hạn đăng nhập, trả sai định dạng) → tin vẫn được đăng, ghi "Chưa tóm tắt được thay đổi này."
Không đăng được vào kênh → bot giữ tin, thử lại mỗi vòng fetch, báo admin một lần.

## Lệnh thường dùng (user `ubuntu`)

```bash
systemctl status repobot
journalctl -u repobot -n 100 --no-pager
sudo -iu repobot /srv/repobot/app/deploy/update.sh && sudo systemctl restart repobot   # cập nhật code bot
```

`update.sh` chỉ `git pull --ff-only` và `npm ci --omit=dev`. Đổi `deploy/repobot.service` thì phải chép lại file
unit bằng `sudo` rồi `sudo systemctl daemon-reload`. Node cài lại bằng `deploy/install-node.sh` (kiểm SHA256).

## Đăng nhập lại agy

Khi kênh admin báo "agy hết hạn đăng nhập":

```bash
ssh -t ubuntu@168.107.68.32 'sudo -iu repobot agy'
```

Chọn Google OAuth, mở URL, đăng nhập tài khoản có subscription Antigravity, dán mã, gõ `/exit`. Chạy từ home
`/srv/repobot` để `/srv/repobot` là trusted workspace (bao cả `read/` và `drafts/`). Không cần restart bot.

## Secret

| Secret | Ở đâu | Xoay vòng |
|---|---|---|
| Token bot Discord | `/srv/repobot/.env` (`DISCORD_TOKEN`) | Developer Portal → Bot → Reset Token → sửa `.env` → restart |
| Private key GitHub App | `/srv/repobot/github-app.pem` | GitHub App → Generate new key → thay file → restart → xoá key cũ trên GitHub |
| Phiên `agy` | `/srv/repobot/.gemini/antigravity-cli/` | `agy` → `/logout`, rồi đăng nhập lại như trên |

`.env` có 9 biến: `DISCORD_TOKEN`, `DISCORD_APP_ID`, `DISCORD_GUILD_ID`, `ADMIN_CHANNEL_ID`, `DISCORD_CHANNEL_IDS`,
`ALLOWED_ROLES`, `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_KEY_PATH`; thêm tuỳ chọn
`NOTIFY_CHANNEL_ID`, `NOTIFY_FEATURE_PUSH` cho kênh thông báo (không phải secret). Kiểm mà không lộ giá trị:
`sudo -iu repobot bash -c 'stat -c "%a %U %n" ~/.env ~/github-app.pem; cut -d= -f1 ~/.env'`.

Không dán các giá trị này vào repo, issue, PR, chat. Lộ token Discord hoặc key GitHub → xoay vòng ngay.

## Nhánh `bot/*`

Ruleset `bot-branches` chỉ cho GitHub App tạo, cập nhật, xoá nhánh `bot/**` (xem `docs/ops/github.md` mục 8).
Vì vậy cả chủ repo cũng **không xoá được** nhánh `bot/*` bằng nút "Delete branch" sau khi đóng PR. Muốn dọn: tạm
thêm mình vào bypass của ruleset, xoá nhánh, rồi gỡ bypass.

## Xử lý sự cố

| Triệu chứng | Làm gì |
|---|---|
| Bot không trả lời lệnh | `systemctl status repobot`; log có `thiếu biến môi trường` → sửa `.env` |
| "Bot tạm nghỉ" | Đăng nhập lại `agy` (mục trên) |
| Bot báo "sai định dạng" liên tục | `agy` tự cập nhật có thể đổi hành vi: `sudo -iu repobot agy changelog`; chạy lại smoke ở plan bot |
| "dữ liệu có thể chưa mới" | `sudo -iu repobot git -C /srv/repobot/main fetch` để xem lỗi mạng/quyền |
| Admin nhận "agy đã ghi vào …" | Bot đã tự huỷ; xem `journalctl` quanh thời điểm đó, báo trưởng nhóm nếu lặp lại |
| PR không tạo được | Kiểm GitHub App còn được cài, ruleset `bot-branches` còn bypass cho App |
| Admin nhận "Không đăng được vào kênh thông báo" | Kiểm `NOTIFY_CHANNEL_ID` đúng kênh, bot còn quyền View Channel + Send Messages |
| Kênh thông báo im dù có PR/commit | Log có `notify` lỗi? Kiểm GitHub App còn được cài; tin chỉ ra sau lần fetch kế tiếp (≤ 5 phút) |

## Hạn chế đã biết

Đã review và chấp nhận khi ra bản đầu; sửa khi gặp thật:

- Dọn thread định kỳ không lấy khoá của thread (có đọc lại trạng thái trước khi làm).
- Khôi phục worktree nháp sau khởi động lại không báo khi mất phần chưa push.
- Tin nhắn vào thread đã đóng không được trả lời.
- Không giới hạn tổng độ dài prompt khi gộp nhiều tin chờ.
- Lỗi GitHub API không kèm nội dung phản hồi trong log.
- Hỏi đáp có thể đọc `read/` đúng lúc nó đang được cập nhật.
- Khi `agy` hết giờ, bot chốt kết quả lúc tiến trình thoát; về lý thuyết có thể mất đuôi stdout (thử 160 lần
  không gặp; nếu gặp sẽ hiện là lỗi định dạng).
- Nút của bản nháp có thể hiện lại cả khi không còn bản nháp chờ duyệt; bấm vào bot trả "không có bản nháp".
- Kênh thông báo trễ tới 5 phút (theo nhịp fetch). PR có commit mới sau khi mở không được báo lại; tin merge có TLDR
  của toàn bộ PR. PR mở trước lúc bật kênh chỉ được báo khi merge.
- Nhãn module trong tin là bảng thô theo thư mục gốc (`core`, `CTD`, `Web`, `Hạ tầng & CI`, `Tài liệu & tooling`,
  `khác`), chưa đọc `docs/dev/ranh-gioi-module.md`.
- Lỗi git/GitHub khi chuẩn bị một tin: thử lại mỗi vòng, sau 12 vòng thì bỏ tin đó và báo admin.

## Gỡ bỏ

```bash
sudo systemctl disable --now repobot && sudo rm /etc/systemd/system/repobot.service && sudo systemctl daemon-reload
```

Thu hồi GitHub App (Settings → Applications → Uninstall), reset token bot Discord, xoá deploy key của VM ở repo
phụ. Xoá `/srv/repobot` hoặc user `repobot` chỉ khi chủ repo yêu cầu rõ.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-27 | Bản đầu: bố trí, lệnh, đăng nhập lại agy, secret, nhánh bot, sự cố, hạn chế đã biết, gỡ bỏ | DYC |
| 1.1 | 2026-09-27 | Thêm kênh thông báo: `NOTIFY_CHANNEL_ID`, `NOTIFY_FEATURE_PUSH`, worktree `notify/`, bật/tắt, sự cố, hạn chế | DYC (soạn cùng Claude) |
