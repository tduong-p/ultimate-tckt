---
doc_id: PLAN-REL-003
title: Plan — tài liệu, dọn dẹp và runbook phát hành đợt 1
version: 1.2
status: active
audience: [dev, ops, ai]
owner: DYC
updated: 2026-10-03
related_code: []
---

# Phát hành đợt 1 — tài liệu, dọn dẹp và runbook — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gỡ hai thứ chặn merge `staging → main` đầu tiên (check `docs` đỏ so với `main`, và runbook phát hành sai/thiếu), đồng thời
dọn các lỗi tài liệu và rác đã phát hiện khi rà soát. Sau plan này, người vận hành có một runbook chạy được từng lệnh để
phát hành, kiểm tra và lùi.

**Architecture:** Chỉ sửa tài liệu và một file rác, không đụng code chạy. Mỗi task là một commit độc lập, kiểm bằng
`npm run docs:index && npm run docs:check -- --base origin/staging` (Task 1 kiểm thêm `--base origin/main`). Phần lớn nội dung
mới nằm trong `docs/ops/deploy-va-nhanh.md` mục 7 (runbook); plan này giữ toàn văn mục đó để thực thi bằng cách trích đúng
khối `section-7`, không gõ lại.

**Tech Stack:** Markdown, `bash` (macOS/Linux), `node` (`tools/docs-check`), `git`. Không cần Docker, MySQL hay SSH để thực thi
Task 1–5; chỉ bước diễn tập tuỳ chọn ở Task 3 cần SSH.

**Spec:** SPEC-REL-001 (`docs/specs/2026-10-03-phat-hanh-dot-1-design.md`) — §3 cổng G2–G6, §4.3 phát hiện R21–R26.

> **Đính chính v1.2 (đọc trước khi dùng các khối `section-7` và `t5-rb-*` bên dưới):** các khối này là bản đã thực thi ở Task 3 và Task 5, nay **lỗi thời ở ba điểm**; nguồn đúng là `docs/ops/deploy-va-nhanh.md` (OPS-DEPLOY-001 4.1) và `docs/playbooks/rollback.md`, không chép lại từ plan.
> 1. Sau #57 `main` có `set_password`, nhưng image `ctd-api` **trước** #54 không có và đặt lại mật khẩu mặc định mỗi lần khởi động; rollback `ctd-api` phải kiểm image trước (§7.6).
> 2. Tag image là SHA của commit push và chỉ dịch vụ có đường dẫn đổi mới được build lại; không giả định cả tag Core và CTD đều bằng `MERGE12` (§7.5 bước 1).
> 3. #54/#55 chỉ nghiệm thu bằng bằng chứng vận hành (O1, O2, §7.2 bước 4); PR #57/#58 dùng `Refs`, không `Closes`.

## Global Constraints

- Plan này mô tả code của `staging` tại `e781aab`. **Không** giả định tính năng của PLAN-REL-002 đã có (rollback tự động khi
  health check lỗi R17, giữ tag GHCR R16, `create-core-admin.sh` đồng bộ membership R15, `client_max_body_size` R13, job
  `infra` chờ test R14, gỡ biến env thừa R19). Chỗ nào runbook phải làm tay vì thiếu những thứ đó thì nói rõ là làm tay.
- Chỉ đụng: `docs/**` (trừ `docs/ba/nguon/**`, `docs/adr/**` và `docs/ai/bat-bien.md`), `core/test-output.txt` (xoá) và
  `core/.gitignore` (Task 4). Không sửa code chạy. Không đổi luật trong `AGENTS.md`, không đổi bất biến.
- Việc thuần tài liệu trong một module nên **làm ngay**, không cần họp. Điểm cần họp được gom ở cuối Task 5 và không chặn
  plan này.
- Mọi lần sửa nội dung một tài liệu: tăng `version` (MINOR cho bổ sung/sửa; MAJOR chỉ Task 3), `updated: 2026-10-03`, thêm một
  dòng vào `## Lịch sử phiên bản`. Số version trong plan là **dự kiến**: nếu file đã được bump bởi PR khác, tăng MINOR từ giá trị
  hiện có và dùng giá trị đó trong dòng lịch sử.
- Không ghi secret, mật khẩu, token, giá trị `.env` vào repo, tài liệu, log hay mô tả PR. Lệnh mẫu chỉ tham chiếu **tên** biến
  trong container (`$MYSQL_ROOT_PASSWORD`, `$MYSQL_DATABASE`). Không in giá trị `CORE_DEVOPS_EMAILS`.
- Khối có info-string `old:ID` và `new:ID` là cặp văn bản cũ/mới: thay **đúng nguyên văn** `old` bằng `new` (công cụ Edit; `old`
  phải khớp duy nhất một chỗ, nếu không khớp thì dừng và đọc lại file). Khối `section-7` là toàn văn mục 7 mới của Task 3.
- Chạy các khối `bash <<'SH' … SH` bằng `bash`, không phải `zsh`. Trên macOS dùng `sed -i.bak` (đã có trong các hàm trợ giúp).
- Test chạy ở CI (xem ghi chú dự án): không chạy `npm test` cục bộ cho việc thuần tài liệu. Không `git push` thẳng `main`/
  `staging`; luồng là nhánh tính năng → PR vào `staging`.
- Commit kết thúc bằng dòng `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; mô tả PR kết thúc bằng
  `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Plan chỉ **mô tả** các lệnh commit/PR; người thực thi mới chạy chúng. Không chạy `gh` để tạo/sửa/đóng gì ngoài Task 6 (và chỉ
  sau khi người dùng đồng ý bằng lời trong chat).
- Cuối cùng chạy `npm run docs:index` (thêm plan này và các tài liệu mới vào `docs/README.md`) rồi
  `npm run docs:check -- --base origin/staging`.

## Review Focus

1. `npm run docs:check -- --base origin/main` xanh trên đúng commit sẽ merge, không chỉ so với `staging` (Task 1, Step 4).
2. Cả chín dòng lịch sử lỗi mã hoá biến mất khỏi **bảng sai**, và mỗi phiên bản bị chèn nhầm có đúng một dòng, tiếng Việt đúng,
   trong **bảng lịch sử** (Task 2, Step 3).
3. Mọi lệnh trong runbook mục 7 khớp script và compose thật (`lib.sh`, `deploy.sh`, `backup.sh`, tên container/service, cổng,
   đường dẫn backup), qua `bash -n`, và không chứa giá trị secret (Task 3, Step 6).
4. Runbook không dùng `git reset --hard` hay `git revert` merge commit trên VM/`main` làm cách rollback, restore vào DB sạch,
   và cổng G3 (`CORE_DEVOPS_EMAILS` rỗng, không membership ngoài TCKT) có cả bước kiểm trước lẫn sau merge (Task 3, Step 6).
5. Mỗi khẳng định đã sửa ở `rollback.md`, `hotfix-production.md`, `moi-truong.md`, `db-migration.md` được đối chiếu lại với code
   bằng `grep` (Task 5, Step 6); và PR #43 chỉ bị đóng sau khi người dùng xác nhận (Task 6, Step 3).

## Thứ tự và PR

- Một nhánh `docs/release-fixes` và một PR vào `staging` gồm Task 1–5, mỗi task một commit. Tạo nhánh từ `origin/staging`; nếu
  PR chứa SPEC-REL-001 và ba plan REL chưa merge thì tạo từ `docs/release-fix-plans` (PR sẽ mang cả chúng). Task 6 không phải
  commit: là một thao tác GitHub cần người dùng đồng ý.
- **Bắt buộc trước khi mở PR `staging → main`:** Task 1 (G2) và Task 3 (G4; đưa G3, G5, G6 vào runbook). Task 2, 4, 5, 6 không
  chặn phát hành. Nếu muốn đưa sớm, tách PR `docs/release-gate` gồm riêng hai commit Task 1 và Task 3 (hai task độc lập nhau).
- Thứ tự cả đợt: (1) PR plan/spec và PR `docs/release-fixes` merge vào `staging`; (2) bản sửa R1 của PLAN-REL-001 (G1);
  (3) `staging` deploy xong, smoke xanh (G5); (4) chạy phần "Trước khi merge" của runbook (G3, G4); (5) PR `staging → main` bằng
  merge commit (G6). PR `docs/release-fixes` phải vào `staging` **trước** bước (3), vì Task 4 sửa `core/` nên CI sẽ build và
  deploy lại Core staging một lần (không đổi hành vi).
- Tiêu đề PR gợi ý: `docs: release gate fixes (PB-DEP-001, runbook đợt 1, lịch sử lỗi mã hoá)`. Nội dung mô tả kết thúc bằng:

```text
Docs: có — PB-DEP-001, OPS-DEPLOY-001 4.0, PB-RB-001, PB-HOT-001, OPS-ENV-001, DEV-DB-001, OPS-BAK-001 và 8 tài liệu sửa lịch sử.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Độ phủ so với SPEC-REL-001:

| Mã | Nội dung | Task |
|---|---|---|
| R21, G2 | `docs:check --base origin/main` xanh | 1 |
| R22 | Chín dòng lịch sử lỗi mã hoá | 2 |
| R24, G3, G4, G5, G6 | Runbook phát hành, sửa mục 1–2 của OPS-DEPLOY-001 | 3 |
| R23 | `core/test-output.txt` | 4 |
| R25 | Bốn tài liệu vận hành sai (và một chỗ liên quan ở `backup-restore.md`) | 5 |
| R26 | PR #43 | 6 |

---

### Task 1: Cập nhật PB-DEP-001 để `docs:check --base origin/main` xanh (R21, G2)

**Files:**
- Modify: `docs/playbooks/nang-dependency.md`
- Modify: `docs/README.md` (sinh bởi `npm run docs:index`)

**Vì sao:** so với `main`, `core/package.json` đổi (Core gỡ `nodemailer`, PLAN-EMAILGO-001) mà PB-DEP-001 — tài liệu có
`related_code: [core/package.json, …]` — chưa được cập nhật, nên `docsImpact` báo đỏ và check `docs` (bắt buộc ở ruleset
`protect-main`) chặn PR `staging → main`. Chỉ bump số version là gian lận; nên thêm nội dung thật: bước gỡ dependency (việc vừa
xảy ra) và quy tắc mà `docs:check` đang áp.

- [ ] **Step 1: Tái hiện lỗi đỏ.**

```bash
git fetch origin
npm run docs:check -- --base origin/main 2>&1 | grep -v '^fatal'
```

Kỳ vọng đúng một lỗi:
`core/package.json changed but PB-DEP-001 (docs/playbooks/nang-dependency.md) was not updated`. Các dòng `fatal: path … not in
origin/main` là nhiễu của tài liệu mới so với `main`, bỏ qua.

- [ ] **Step 2: Sửa frontmatter** (nếu version hiện tại khác `1.1`, tăng MINOR từ giá trị đó):

~~~text old:t1-fm
version: 1.1
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-26
~~~

~~~markdown new:t1-fm
version: 1.2
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-03
~~~

- [ ] **Step 3: Thêm bước gỡ dependency, mục kiểm tra và quy tắc docs-check:**

~~~text old:t1-step
6. **Đọc changelog/breaking-change** của bản nâng nếu là major version — không nâng major mà không đọc gì.
~~~

~~~markdown new:t1-step
6. **Đọc changelog/breaking-change** của bản nâng nếu là major version — không nâng major mà không đọc gì.
7. **Gỡ dependency không còn dùng** (ví dụ `nodemailer` khi Core bỏ module email, PLAN-EMAILGO-001): `npm uninstall <package>` (cập nhật cả `package-lock.json`), rồi `git grep -n "<package>" -- core ':!core/package-lock.json'` phải rỗng và `npm test` phải xanh. Gỡ cũng là đổi `package.json`: `docs:check` coi nó như nâng (xem mục "Tài liệu phải cập nhật").
~~~

~~~text old:t1-check
- [ ] PR chỉ nâng dependency đã nêu trong tiêu đề, không lẫn thay đổi tính năng khác.
~~~

~~~markdown new:t1-check
- [ ] PR chỉ nâng dependency đã nêu trong tiêu đề, không lẫn thay đổi tính năng khác.
- [ ] Nếu gỡ dependency: không còn `require`/`import` nó trong mã nguồn (`git grep`), và `package-lock.json` đổi cùng `package.json`.
~~~

~~~text old:t1-docs
- ADR mới trong `docs/adr/` nếu đây là nâng major version có rủi ro/breaking change đáng kể.
~~~

~~~markdown new:t1-docs
- ADR mới trong `docs/adr/` nếu đây là nâng major version có rủi ro/breaking change đáng kể.
- **Chính tài liệu này.** `core/package.json` và `services/ctd-api/backend/pyproject.toml` nằm trong `related_code` của nó, nên mọi PR đổi hai file đó (kể cả chỉ nâng bản vá hay chỉ gỡ) phải tăng version tài liệu này và thêm một dòng vào Lịch sử nêu thư viện và phiên bản. Thiếu thì `npm run docs:check` đỏ, và check `docs` là bắt buộc để merge vào `main`.
~~~

~~~text old:t1-hist
| 1.1 | 2026-09-26 | Version bump core/package.json 2.2.0 | DYC |
~~~

~~~markdown new:t1-hist
| 1.1 | 2026-09-26 | Version bump core/package.json 2.2.0 | DYC |
| 1.2 | 2026-10-03 | Thêm bước gỡ dependency (Core gỡ `nodemailer`) và quy tắc: đổi `package.json`/`pyproject.toml` thì phải ghi dòng lịch sử tài liệu này | DYC |
~~~

- [ ] **Step 4: Index và commit.** `docs:check` chỉ nhìn các commit (`base...HEAD`), nên phải commit trước khi kiểm.

```bash
npm run docs:index
git add docs
git commit -m "docs(playbooks): PB-DEP-001 covers removing dependencies" -m "Core dropped nodemailer, which made docs:check fail against main (R21, gate G2). Add the removal step, a check item and the related_code rule." -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Kiểm tra cả hai base.** `--base origin/main` là cái đang đỏ ở Step 1.

```bash
npm run docs:check -- --base origin/staging
npm run docs:check -- --base origin/main 2>&1 | grep -v '^fatal'
```

Kỳ vọng: cả hai in `docs ok: N files checked`. Nếu đỏ vì `README out of date`, chạy lại `npm run docs:index`, `git add docs`,
`git commit --amend --no-edit` rồi kiểm lại.

---

### Task 2: Sửa chín dòng lịch sử lỗi mã hoá ở tám tài liệu (R22)

**Files:** (mỗi file: xoá dòng lỗi ở bảng sai, thêm dòng lịch sử đúng, bump version)
- Modify: `docs/dev/api.md` (DEV-API-001; dòng lỗi ở bảng routing Core)
- Modify: `docs/dev/developer-3-interface.md` (DEV-GUIDE-003; bảng action code)
- Modify: `docs/dev/ranh-gioi-module.md` (DEV-MOD-001; bảng module)
- Modify: `docs/dev/test.md` (DEV-TEST-001; dòng 2.12 hỏng ngay trong bảng lịch sử)
- Modify: `docs/planning/ke-hoach-hub-core-operations.md` (PLAN-HUB-001; bảng timeline)
- Modify: `docs/specs/2026-09-29-pilot-dieu-hanh-design.md` (SPEC-PILOT-001; bảng phạm vi)
- Modify: `docs/specs/2026-09-29-pilot-dieu-hanh-plan.md` (PLAN-PILOT-001; bảng lộ trình PR)
- Modify: `docs/specs/2026-10-02-go-email-cu-plan.md` (PLAN-EMAILGO-001; bảng phạm vi, **hai** dòng lỗi)
- Modify: `docs/README.md` (sinh bởi `npm run docs:index`)

**Hiện trạng đã đối chiếu:** một công cụ sinh dòng lịch sử đã chèn nhầm `| X.Y | 2026-10-02 | C?p nh?t … |` ngay dưới dòng
phân cách của **bảng đầu tiên** trong mỗi file (ký tự tiếng Việt thành `?`; ba file `api.md`, `developer-3-interface.md`, `2026-09-29-pilot-dieu-hanh-design.md` còn có cả ký tự thay thế U+FFFD).
Hệ quả phụ: dòng đó vẫn "thoả" `docs:check` (nó chỉ tìm `^| X.Y |` ở bất cứ đâu trong body), nên lỗi không bị phát hiện; còn
bảng chứa nó thì sai. Hai file (`api.md`, `developer-3-interface.md`) còn bị chèn một dòng chú thích HTML
`updated: 2026-10-02 dev3 routes` ở cuối file.

Hai điểm khác với mô tả ban đầu của rà soát: regex `C?p nh?t` bỏ sót `api.md` (dòng đó là `Chu?n h…a route…`), nên dùng
regex rộng hơn `chữ?chữ` (bên dưới); và `go-email-cu-plan.md` có **hai** dòng lỗi (2.4 và 2.3) cùng `test.md` có dòng 2.12 hỏng ngay
trong bảng lịch sử (thiếu cột "Người") — tổng cộng chín. Các dòng khôi phục được **nối vào cuối** bảng lịch sử, nên thứ tự
phiên bản trong bảng có thể lộn xộn (các bảng này vốn đã không theo thứ tự); `docs:check` không đòi thứ tự.

Nguồn văn bản đúng cho từng dòng:

| File | Dòng lịch sử cần có | Nguồn |
|---|---|---|
| `api.md` | 5.3 `Chuẩn hoá route directives và submissions` | khôi phục từ dòng lỗi |
| `developer-3-interface.md` | 1.2 `Cập nhật giao diện điều hành` | khôi phục từ dòng lỗi |
| `ranh-gioi-module.md` | 1.6 `Cập nhật ranh giới module dieu-hanh` | khôi phục từ dòng lỗi (giữ nguyên `dieu-hanh`, vốn là ASCII) |
| `test.md` | 2.12 `Cập nhật mock test directives` | khôi phục từ dòng lỗi |
| `ke-hoach-hub-core-operations.md` | 1.12 `Cập nhật kế hoạch triển khai` | khôi phục từ dòng lỗi |
| `pilot-dieu-hanh-design.md` | 1.13 `Cập nhật thiết kế phân quyền` | khôi phục từ dòng lỗi |
| `pilot-dieu-hanh-plan.md` | 1.11 `Cập nhật kế hoạch pilot` | khôi phục từ dòng lỗi |
| `go-email-cu-plan.md` | 2.2, 2.3 (dòng thật) | `git show 479c05f^2:docs/specs/2026-10-02-go-email-cu-plan.md` — bản `staging` trước merge, đã có đúng hai dòng này |
| `go-email-cu-plan.md` | 2.4 | dựng lại: `479c05f` chỉ đổi version 2.2 → 2.4 và chèn hai dòng lỗi, nội dung không đổi |

- [ ] **Step 1: Đếm trước và tạo hàm trợ giúp.** Phải ra **9** dòng.

```bash
LC_ALL=C git grep -nE '^\| [0-9]+\.[0-9]+ \| [0-9-]+ \| .*[A-Za-z]\?[A-Za-z]' -- 'docs/*.md' ':!docs/ba/nguon' | wc -l
```

Tạo file hàm trợ giúp **ngoài repo** (dùng lại ở Task 4; mất thì chạy lại khối này):

```bash
cat > "${TMPDIR:-/tmp}/docs-fix-lib.sh" <<'SH'
# Hàm trợ giúp cho Task 2 và Task 4. Chạy bằng bash, từ gốc repo.
TODAY=2026-10-03
bump() {                 # bump FILE: tăng MINOR, đặt updated, in version mới
  local old new
  old="$(sed -n '1,12s/^version: //p' "$1" | head -n 1)"
  [ -n "$old" ] || { echo "không đọc được version: $1" >&2; return 1; }
  new="${old%.*}.$(( ${old#*.} + 1 ))"
  sed -i.bak -e "1,12{s/^version: .*/version: $new/;s/^updated: .*/updated: $TODAY/;}" "$1" && rm -f "$1.bak"
  echo "$new"
}
drop_bad_rows() {        # drop_bad_rows FILE SO_DONG: xoá dòng lịch sử lỗi mã hoá, dừng nếu số dòng khác kỳ vọng
  local n
  n="$(LC_ALL=C grep -cE '^\| [0-9]+\.[0-9]+ \| [0-9-]+ \| .*[A-Za-z]\?[A-Za-z]' "$1" || true)"
  [ "$n" = "$2" ] || { echo "$1: tìm thấy $n dòng lỗi, kỳ vọng $2" >&2; return 1; }
  LC_ALL=C grep -vE '^\| [0-9]+\.[0-9]+ \| [0-9-]+ \| .*[A-Za-z]\?[A-Za-z]' "$1" > "$1.tmp" && mv "$1.tmp" "$1"
}
strip_trailing_blank() { # bỏ dòng trống ở cuối file
  awk '{a[NR]=$0} END{n=NR; while (n>0 && a[n]=="") n--; for (i=1;i<=n;i++) print a[i]}' "$1" > "$1.tmp" && mv "$1.tmp" "$1"
}
append_history() {       # append_history FILE ROW...: thêm dòng vào cuối bảng lịch sử
  local f="$1" last; shift
  last="$(awk '/^## Lịch sử phiên bản/{h=1;next} h && /^\|/{n=NR} END{print n+0}' "$f")"
  [ "$last" -gt 0 ] || { echo "không thấy bảng lịch sử: $f" >&2; return 1; }
  ROWS="$(printf '%s\n' "$@")" awk -v n="$last" '{print} NR==n{print ENVIRON["ROWS"]}' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
}
SH
```

- [ ] **Step 2: Áp bản sửa cho cả tám file.** Mỗi file dừng ngay (`set -e`) nếu số dòng lỗi không đúng kỳ vọng, nên chạy lại sau lỗi
  giữa chừng thì phải `git restore docs` trước.

```bash
bash <<'SH'
set -euo pipefail
source "${TMPDIR:-/tmp}/docs-fix-lib.sh"
cd "$(git rev-parse --show-toplevel)"

# 1. api.md: dòng 5.3 nằm nhầm trong bảng routing Core; bỏ chú thích HTML thừa cuối file
f=docs/dev/api.md
drop_bad_rows "$f" 1
sed -i.bak '/^<!-- updated: 2026-10-02 dev3 routes -->$/d' "$f" && rm -f "$f.bak"
strip_trailing_blank "$f"
new="$(bump "$f")"
append_history "$f" \
  '| 5.3 | 2026-10-02 | Chuẩn hoá route directives và submissions | DYC |' \
  "| $new | $TODAY | Sửa dòng lịch sử 5.3 bị lỗi mã hoá và nằm nhầm trong bảng routing Core; bỏ chú thích HTML thừa cuối file | DYC |"

# 2. developer-3-interface.md: dòng 1.2 nằm nhầm trong bảng action code; bỏ chú thích HTML thừa
f=docs/dev/developer-3-interface.md
drop_bad_rows "$f" 1
sed -i.bak '/^<!-- updated: 2026-10-02 dev3 routes -->$/d' "$f" && rm -f "$f.bak"
strip_trailing_blank "$f"
new="$(bump "$f")"
append_history "$f" \
  '| 1.2 | 2026-10-02 | Cập nhật giao diện điều hành | DYC |' \
  "| $new | $TODAY | Sửa dòng lịch sử 1.2 bị lỗi mã hoá và nằm nhầm trong bảng action code; bỏ chú thích HTML thừa cuối file | DYC |"

# 3. ranh-gioi-module.md: dòng 1.6 nằm nhầm trong bảng module (không đổi luật nào)
f=docs/dev/ranh-gioi-module.md
drop_bad_rows "$f" 1
new="$(bump "$f")"
append_history "$f" \
  '| 1.6 | 2026-10-02 | Cập nhật ranh giới module dieu-hanh | DYC |' \
  "| $new | $TODAY | Sửa dòng lịch sử 1.6 bị lỗi mã hoá và nằm nhầm trong bảng module; luật không đổi | DYC |"

# 4. test.md: dòng 2.12 hỏng ngay trong bảng lịch sử (thiếu cột Người) — xoá rồi ghi lại đúng
f=docs/dev/test.md
drop_bad_rows "$f" 1
new="$(bump "$f")"
append_history "$f" \
  '| 2.12 | 2026-10-02 | Cập nhật mock test directives | DYC |' \
  "| $new | $TODAY | Sửa dòng lịch sử 2.12 bị lỗi mã hoá và thiếu cột Người | DYC |"

# 5. ke-hoach-hub-core-operations.md: dòng 1.12 nằm nhầm trong bảng timeline
f=docs/planning/ke-hoach-hub-core-operations.md
drop_bad_rows "$f" 1
new="$(bump "$f")"
append_history "$f" \
  '| 1.12 | 2026-10-02 | Cập nhật kế hoạch triển khai | DYC |' \
  "| $new | $TODAY | Sửa dòng lịch sử 1.12 bị lỗi mã hoá và nằm nhầm trong bảng timeline | DYC |"

# 6. pilot-dieu-hanh-design.md: dòng 1.13 nằm nhầm trong bảng phạm vi
f=docs/specs/2026-09-29-pilot-dieu-hanh-design.md
drop_bad_rows "$f" 1
new="$(bump "$f")"
append_history "$f" \
  '| 1.13 | 2026-10-02 | Cập nhật thiết kế phân quyền | DYC |' \
  "| $new | $TODAY | Sửa dòng lịch sử 1.13 bị lỗi mã hoá và nằm nhầm trong bảng phạm vi | DYC |"

# 7. pilot-dieu-hanh-plan.md: dòng 1.11 nằm nhầm trong bảng lộ trình PR
f=docs/specs/2026-09-29-pilot-dieu-hanh-plan.md
drop_bad_rows "$f" 1
new="$(bump "$f")"
append_history "$f" \
  '| 1.11 | 2026-10-02 | Cập nhật kế hoạch pilot | DYC |' \
  "| $new | $TODAY | Sửa dòng lịch sử 1.11 bị lỗi mã hoá và nằm nhầm trong bảng lộ trình PR | DYC |"

# 8. go-email-cu-plan.md: hai dòng lỗi (2.4, 2.3) trong bảng phạm vi; khôi phục 2.2, 2.3 từ staging (479c05f^2), dựng lại 2.4
f=docs/specs/2026-10-02-go-email-cu-plan.md
drop_bad_rows "$f" 2
new="$(bump "$f")"
append_history "$f" \
  '| 2.2 | 2026-10-02 | Facade nay đã có sender sang Noti (PLAN-NOTI-002); không cần đổi thân facade | DYC |' \
  '| 2.3 | 2026-10-02 | Ghi chú: migration unit_id đã hotfix, không liên quan plan này | DYC |' \
  '| 2.4 | 2026-10-02 | Tăng version khi đồng bộ chỉ mục tài liệu (merge `479c05f`); nội dung không đổi | DYC |' \
  "| $new | $TODAY | Sửa hai dòng lịch sử 2.3 và 2.4 bị lỗi mã hoá và nằm nhầm trong bảng phạm vi; khôi phục dòng 2.2, 2.3 bị mất | DYC |"
echo "xong 8 file"
SH
```

- [ ] **Step 3: Kiểm tra từng chỗ.**

```bash
bash <<'SH'
cd "$(git rev-parse --show-toplevel)"
echo "dòng lỗi còn lại (kỳ vọng 0): $(LC_ALL=C git grep -nE '^\| [0-9]+\.[0-9]+ \| [0-9-]+ \| .*[A-Za-z]\?[A-Za-z]' -- 'docs/*.md' ':!docs/ba/nguon' | wc -l)"
echo "ký tự thay thế U+FFFD còn lại (kỳ vọng 0): $(LC_ALL=C git grep -nI $'\xef\xbf\xbd' -- docs ':!docs/ba/nguon' ':!docs/specs/2026-10-03-phat-hanh-dot-1-*' | wc -l)"
echo "chú thích thừa còn lại (kỳ vọng 0): $(git grep -n 'dev3 routes' -- docs ':!docs/specs/2026-10-03-phat-hanh-dot-1-*' | wc -l)"
check_row() {  # mỗi phiên bản phải có 0 dòng TRƯỚC tiêu đề lịch sử và đúng 1 dòng SAU nó
  local before after
  before="$(awk '/^## Lịch sử phiên bản/{exit} {print}' "$1" | grep -c "^| $2 |" || true)"
  after="$(awk 'h{print} /^## Lịch sử phiên bản/{h=1}' "$1" | grep -c "^| $2 |" || true)"
  echo "$1 $2: trước=$before sau=$after (kỳ vọng 0 và 1)"
}
check_row docs/dev/api.md 5.3
check_row docs/dev/developer-3-interface.md 1.2
check_row docs/dev/ranh-gioi-module.md 1.6
check_row docs/dev/test.md 2.12
check_row docs/planning/ke-hoach-hub-core-operations.md 1.12
check_row docs/specs/2026-09-29-pilot-dieu-hanh-design.md 1.13
check_row docs/specs/2026-09-29-pilot-dieu-hanh-plan.md 1.11
check_row docs/specs/2026-10-02-go-email-cu-plan.md 2.2
check_row docs/specs/2026-10-02-go-email-cu-plan.md 2.3
check_row docs/specs/2026-10-02-go-email-cu-plan.md 2.4
git diff --stat | tail -n 12
SH
```

Kỳ vọng: ba dòng đếm đầu là `0`; mọi `check_row` là `trước=0 sau=1`; `git diff --stat` chỉ có tám file `docs/…`, mỗi file thêm
vài dòng và xoá 1–2 dòng (không có file nào xoá nhiều hơn thế). Đọc nhanh `git diff docs/dev/test.md`: dòng `2.12` cũ (thiếu
cột Người) đã biến mất và dòng mới nằm cuối bảng lịch sử.

- [ ] **Step 4: Index và check.**

```bash
npm run docs:index
npm run docs:check -- --base origin/staging
```

Kỳ vọng `docs ok: N files checked`. (docs-check chỉ nhìn commit; nếu báo thiếu bump thì commit trước ở Step 5 rồi chạy lại.)

- [ ] **Step 5: Commit.**

```bash
git add docs
git commit -m "docs: fix nine mojibake history rows in eight docs" \
  -m "Rows like 'C?p nh?t …' had been inserted under the first table of each doc instead of the history table. Restore them in the history table with correct Vietnamese, recover the real 2.2/2.3 rows of the email-removal plan from staging, drop two stray HTML comments (R22). Content of the docs is unchanged." \
  -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
npm run docs:check -- --base origin/staging
```

---

### Task 3: Runbook phát hành đợt 1 trong `docs/ops/deploy-va-nhanh.md` (R24, G3–G6)

**Files:**
- Modify: `docs/ops/deploy-va-nhanh.md` (OPS-DEPLOY-001: 3.1 → 4.0; viết lại mục 7, sửa mục 1, 2, 6)
- Modify: `docs/README.md` (sinh bởi `npm run docs:index`)

**Sai gì ở bản cũ (đã đối chiếu với `infra/scripts/*.sh` và compose):**

| Chỗ cũ | Sai vì |
|---|---|
| `backup.sh` → "lưu ở `/opt/ultimate-tckt/production/backups/`" | script ghi vào `/opt/ultimate-tckt/backups/<env>-<yyyymmdd-hhmm>-{core,ctd}.sql.gz` |
| restore `-f ../infra/…` + `mysql … ultimate_tckt < <backup-file>` | sai đường dẫn compose/env-file, thiếu `gunzip`, tên DB là `$MYSQL_DATABASE` trong container; restore đè lên DB đã migrate để lại bảng thừa |
| `git reset --hard <commit>` trên VM | luật dự án cấm; thư mục VM chỉ để lấy script/compose, lùi bằng tag image |
| `curl http://127.0.0.1:3000/api/health` cho production | production nghe cổng 3001 (3000 là staging) |
| `staging.tckt.hust.edu.vn` | tên miền thật là `tckt-hub-staging.duckdns.org` |
| lệnh `docker compose … exec core-db mysql -u root -p …` gõ tay | compose đòi `${CORE_IMAGE_TAG:?}`/`${CTD_API_IMAGE_TAG:?}` cho **mọi** lệnh; gõ tay không có chúng sẽ lỗi |
| "`SELECT … unit_memberships`" làm kiểm tra **trước** merge | production chưa có bảng đó trước khi Core mới khởi động |
| mục 1: "mỗi push (sau khi test xanh) là một lần deploy" | đúng cho `deploy-*`, sai cho job `infra`: chỉ `needs: changes`, không chờ test (R14) |
| mục 6: `docker compose … logs -f core` | Core ghi log vào file `/app/log.md` trong container; compose cần tag env |
| không có checklist smoke | SPEC-PILOT-001 §7.3 đòi ghi vào `docs/ops/` |

Những điều đã kiểm chứng khi viết mục mới: tag image deploy = 12 ký tự đầu SHA push (`changes` job); `/api/version` chỉ trả version
`package.json` và chuỗi build cố định, **không** có SHA; Core migrate lúc khởi động (`core/src/runtime.js`), lỗi thì thoát mã 1;
migration chỉ bootstrap DYC khi `DEVOPS_EMAILS` có giá trị hoặc cột `users.is_devops` có dòng bằng 1; backfill sao chép **mọi** user
vào membership TCKT theo `users.role`; seed admin CTD của `main` đặt lại mật khẩu mặc định ở mỗi lần khởi động (#54, đã sửa ở
`staging`); không có migration Alembic nào trong đợt này (`services/ctd-api/backend/alembic` không đổi giữa `main` và `staging`);
`core/db.sql` không đổi; `deploy-core`, `deploy-ctd-api` và `infra` của một push chạy song song, tuần tự bằng `flock` trên VM.

- [ ] **Step 1: Trích mục 7 mới ra file tạm** (từ chính plan này, đang nằm trong working tree):

```bash
PLAN=docs/specs/2026-10-03-phat-hanh-dot-1-tai-lieu-plan.md
awk '/^~~~markdown section-7$/{f=1;next} /^~~~$/{f=0} f' "$PLAN" > "${TMPDIR:-/tmp}/section7.md"
wc -l "${TMPDIR:-/tmp}/section7.md"
head -n 1 "${TMPDIR:-/tmp}/section7.md"
grep -c '^### 7\.' "${TMPDIR:-/tmp}/section7.md"
```

Kỳ vọng: dòng đầu là `## 7. Phát hành đợt 1: ...`, và `7` mục con (`7.0` đến `7.6`). Nếu `wc -l` ra 0 thì plan không có trong working tree: lấy bằng
`git show docs/release-fix-plans:$PLAN` hoặc nhánh đang chứa plan.

- [ ] **Step 2: Thay mục 7 cũ (từ `## 7.` đến trước `## Lịch sử phiên bản`) bằng nội dung vừa trích:**

```bash
f=docs/ops/deploy-va-nhanh.md
start="$(grep -n '^## 7\. ' "$f" | cut -d: -f1)"
end="$(grep -n '^## Lịch sử phiên bản' "$f" | cut -d: -f1)"
[ -n "$start" ] && [ -n "$end" ] && [ "$start" -lt "$end" ] || { echo "không tìm thấy mục 7"; exit 1; }
{ head -n $((start-1)) "$f"; cat "${TMPDIR:-/tmp}/section7.md"; echo; tail -n +"$end" "$f"; } > "$f.new" && mv "$f.new" "$f"
grep -n '^## ' "$f"
```

Kỳ vọng danh sách tiêu đề: mục 1 đến 6, `## 7. Phát hành đợt 1: …`, `## Lịch sử phiên bản`.

- [ ] **Step 3: Sửa mục 1, 2, 6** (đúng nguyên văn; `old` phải khớp duy nhất).

~~~text old:t3-s1
Không có bước duyệt thủ công riêng cho deploy — mỗi push (sau khi test xanh) là một lần deploy tự động, miễn là biến repo `DEPLOY_ENABLED == 'true'` (xem mục 4).
~~~

~~~markdown new:t3-s1
Không có bước duyệt thủ công riêng cho deploy: push đủ điều kiện là deploy tự động, miễn là biến repo `DEPLOY_ENABLED == 'true'` (production cần thêm `PROD_DEPLOY_ENABLED == 'true'`, xem mục 4). Các job deploy ứng dụng (`deploy-core`, `deploy-ctd-api`, `deploy-noti`) chỉ chạy **sau khi** test và build của app đó xanh; riêng job `infra` chỉ cần `changes`, nên **không chờ test** — cấu hình nginx/compose có thể được áp lên production khi test còn đỏ (xem mục 2, job 6).
~~~

~~~text old:t3-s2-job6
6. **`infra`** — chạy khi `infra/**` đổi (push) hoặc chạy tay (`workflow_dispatch`), cũng cần `DEPLOY_ENABLED == 'true'`: SSH chạy `infra/scripts/apply-infra.sh <env> [apply_db]`. Tick `apply_db` khi kích hoạt thủ công để đồng thời cập nhật `core-db`/`ctd-db` (mặc định false — không đụng database).
~~~

~~~markdown new:t3-s2-job6
6. **`infra`** — chạy khi `infra/**` đổi (push) hoặc chạy tay (`workflow_dispatch`), cũng cần `DEPLOY_ENABLED == 'true'` (production: thêm `PROD_DEPLOY_ENABLED`): SSH chạy `infra/scripts/apply-infra.sh <env> [apply_db]`. Tick `apply_db` khi kích hoạt thủ công để đồng thời cập nhật `core-db`/`ctd-db` (mặc định false — không đụng database). Job này chỉ `needs: changes`, **không** chờ `test-*` hay `build-*` (phát hiện R14 của SPEC-REL-001): với `main`, cấu hình được áp ngay khi push dù test chưa xanh.
~~~

~~~text old:t3-s2-para
Các job deploy/infra **không** dùng concurrency group của GitHub (GitHub huỷ job đang chờ khi job mới vào cùng group — deploy sẽ bị bỏ âm thầm). Việc tuần tự do `flock` trên VM đảm nhận (`/tmp/ultimate-tckt-<env>-deploy.lock`, chờ tối đa 180 giây). Thứ tự giữa `infra` và `deploy-*` khi cùng đổi trong một push không được đảm bảo (chấp nhận được vì cả hai đều `git pull` trước khi chạy).
~~~

~~~markdown new:t3-s2-para
Các job deploy/infra **không** dùng concurrency group của GitHub (GitHub huỷ job đang chờ khi job mới vào cùng group — deploy sẽ bị bỏ âm thầm). Việc tuần tự do `flock` trên VM đảm nhận (`/tmp/ultimate-tckt-<env>-deploy.lock`, chờ tối đa 180 giây). Thứ tự giữa `infra` và `deploy-*` khi cùng đổi trong một push không được đảm bảo (chấp nhận được vì cả hai đều `git pull` trước khi chạy): `deploy-core`, `deploy-ctd-api` và `infra` của cùng một push chạy song song, và push chỉ coi là xong khi **cả ba** xanh.
~~~

~~~text old:t3-s6
```bash
ssh ubuntu@168.107.68.32
cd /opt/ultimate-tckt/<staging|production>
docker compose -p ultimate-tckt-<env> --env-file infra/.env -f infra/compose/docker-compose.<env>.yml logs -f core
```
~~~

~~~markdown new:t3-s6
```bash
ssh ubuntu@168.107.68.32
docker logs -f ultimate-tckt-<staging|production>-core-1
```

`docker logs` chỉ cho thấy thông báo khởi động và lỗi in ra `console` (ví dụ migration lỗi rồi thoát). Log ứng dụng của Core (`core/src/logger.js`) ghi vào file `/app/log.md` **trong container** và mất khi container bị tạo lại: `docker exec ultimate-tckt-<env>-core-1 tail -n 100 /app/log.md`. Lệnh `docker compose` gõ tay cần nạp tag image trước (xem mục 7.0).
~~~

~~~text old:t3-fm
version: 3.1
status: active
audience: [dev, ops, ai]
owner: DYC
updated: 2026-10-02
~~~

~~~markdown new:t3-fm
version: 4.0
status: active
audience: [dev, ops, ai]
owner: DYC
updated: 2026-10-03
~~~

~~~text old:t3-hist
| 3.1 | 2026-10-02 | Thêm Noti vào pipeline: `test-noti`/`build-noti`/`deploy-noti` (chỉ staging), `deploy.sh … noti` | DYC |
~~~

~~~markdown new:t3-hist
| 3.1 | 2026-10-02 | Thêm Noti vào pipeline: `test-noti`/`build-noti`/`deploy-noti` (chỉ staging), `deploy.sh … noti` | DYC |
| 4.0 | 2026-10-03 | Viết lại mục 7 thành runbook phát hành đợt 1 (cổng G1–G6, backup/restore đúng đường dẫn và vào DB sạch, cổng/tên miền đúng, smoke, rollback không dùng `git reset`); mục 1–2: job `infra` không chờ test; mục 6: log Core nằm trong container | DYC |
~~~

Toàn văn mục 7 mới (khối này là nguồn cho Step 1; không chứa dòng nào bắt đầu bằng ba dấu `~`):

~~~markdown section-7
## 7. Phát hành đợt 1: `staging` → `main`

Runbook cho lần `staging → main` đầu tiên (SPEC-PILOT-001 §3; cổng và phát hiện lấy từ SPEC-REL-001). Merge vào `main` là production
tự deploy và **không có bước duyệt environment**, nên mọi kiểm tra phải xong **trước** khi bấm merge. Mục này mô tả code `staging`
tại thời điểm viết; việc nào còn làm tay vì chưa có script (rollback tự động khi health check lỗi, giữ tag GHCR, nginx giới hạn
upload…) đều được nêu rõ ở chỗ đó. Từ bước 7.2 đến hết 7.5, **đóng băng `staging`**: không merge thêm gì vào.

### 7.0 Công cụ dùng trong phiên SSH

Compose của cả hai môi trường đòi `${CORE_IMAGE_TAG:?}` và `${CTD_API_IMAGE_TAG:?}` (staging thêm `${NOTI_IMAGE_TAG:?}`) cho **mọi**
lệnh `docker compose`, kể cả `exec` và `logs`. `deploy.sh` và `apply-infra.sh` tự nạp chúng; lệnh gõ tay và `backup.sh` thì không,
nên phải nạp trước bằng `ut_tags`. Dán các hàm sau một lần mỗi phiên:

```bash
ssh ubuntu@168.107.68.32
source /opt/ultimate-tckt/production/infra/scripts/lib.sh   # ut_compose, ut_current_tag, ut_health

ut_tags() {   # ut_tags <staging|production>: lấy tag image đang chạy để compose nội suy được
  export CORE_IMAGE_TAG="$(ut_current_tag "$1" core)"
  export CTD_API_IMAGE_TAG="$(ut_current_tag "$1" ctd-api)"
  export NOTI_IMAGE_TAG="$(ut_current_tag "$1" noti-api)"
  [ -n "$NOTI_IMAGE_TAG" ] || export NOTI_IMAGE_TAG=unset
}

core_sql() {  # core_sql <staging|production> '<câu SQL>': chạy SQL bằng root MySQL ngay trong container core-db
  ut_compose "$1" exec -T core-db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "$0"' "$2"
}
```

Mật khẩu và tên database nằm trong container `core-db` (`$MYSQL_ROOT_PASSWORD`, `$MYSQL_DATABASE`), không đi qua shell của host và
không bao giờ gõ ra màn hình; MySQL in cảnh báo "password on the command line" ra stderr là bình thường. Không gọi `ut_env_branch`,
`ut_lock`, `ut_die` trong phiên tương tác: chúng `exit` và đóng luôn phiên SSH. Container chưa chạy thì tag của nó rỗng và compose
báo thiếu biến: xem tag thật bằng `docker ps`.

Diễn tập hai hàm này trên staging (`ut_tags staging`, `core_sql staging 'SELECT COUNT(*) FROM users;'`) trước ngày phát hành.

### 7.1 Cổng phát hành

Chỉ mở PR `staging → main` khi **mọi** dòng dưới đây đã đạt (nguồn: SPEC-REL-001 §3).

| # | Điều kiện | Kiểm bằng |
|---|---|---|
| G1 | Bản sửa R1 (đổi `users.role` ở trang Tổ không đồng bộ membership TCKT) đã merge vào `staging` | 7.2 bước 2 |
| G2 | `npm run docs:check -- --base origin/main` xanh | 7.2 bước 3 |
| G3 | Production **giữ `CORE_DEVOPS_EMAILS` rỗng**, không có `users.is_devops = 1`, và **không có membership ngoài TCKT** cho tới khi xong nhóm B và C của PLAN-REL-001 | 7.2 bước 6, 7.5 bước 4 |
| G4 | Mục 7 này đã có trên `staging` và phần "Trước khi merge" (7.2) đã chạy xong | 7.2 |
| G5 | Checklist smoke (7.4) xanh trên **staging** | 7.2 bước 9 |
| G6 | PR merge bằng **merge commit** (không squash, không rebase) | 7.3, 7.5 bước 1 |

Vì sao G3: sau phát hành quyền đọc từ membership. Không có DYC, BTV hay đơn vị khác thì các lỗ hổng phân quyền đã biết (R2–R9 của
SPEC-REL-001) không có ai để khai thác; migration chỉ tạo membership DYC khi `DEVOPS_EMAILS` có giá trị hoặc có `users.is_devops = 1`.
Vì sao G6: squash/rebase tạo commit trên `main` mà `staging` không có, nên lần `staging → main` sau sẽ hiện lại toàn bộ diff cũ.

### 7.2 Trước khi merge (G1–G5)

**Trên máy dev**, trong bản sao sạch (không có thay đổi chưa commit):

1. Cập nhật tham chiếu và ghi lại commit sẽ phát hành:
   ```bash
   git fetch origin
   STAGING_SHA="$(git rev-parse origin/staging)"
   git log --oneline origin/staging..origin/main | wc -l    # phải là 0: staging đã chứa mọi thứ của main
   git log --oneline origin/main..origin/staging | wc -l    # số commit sẽ lên production
   ```
   Dòng đầu khác 0 nghĩa là `main` có commit mà `staging` chưa có (hotfix chưa merge ngược): dừng, làm theo
   `../playbooks/hotfix-production.md` bước 7 trước.
2. G1: bản sửa R1 đã vào `staging` và CI của `staging` xanh (tab Actions, lần chạy `deploy` mới nhất):
   ```bash
   git grep -n 'syncTcktMembershipFromRole' "$STAGING_SHA" -- core/src/routes/teams.js   # phải có kết quả
   ```
   Nếu cuộc họp chọn cách sửa khác `syncTcktMembershipFromRole` (SPEC-REL-001 §5), bằng chứng là test của PLAN-REL-001 Task 1 xanh
   trong CI `staging`.
3. G2: kiểm tài liệu so với `main` trên đúng commit sẽ merge:
   ```bash
   git switch --detach "$STAGING_SHA"
   npm run docs:check -- --base origin/main     # phải in "docs ok"
   git switch -
   ```
4. #54 & #55: Bản sửa seed admin CTD (#54) và gỡ dump khỏi main (#55) phải được xử lý và kiểm chứng xong TRƯỚC release:
   ```bash
   git show "$STAGING_SHA:services/ctd-api/backend/app/seeds/admin_seed.py" | grep -c MOI_TRUONG_DEV   # phải >= 1
   ```
   Tuyệt đối không phát hành khi #54 chưa xong vì seed cũ trên `main` đặt lại mật khẩu admin CTD về mật khẩu mặc định công khai ở **mỗi lần khởi động**; bản mới không bao giờ đổi mật khẩu của tài khoản đã có. Đợt này mang bản sửa lên production, và 7.5 bước 6 chạy `set_password` đặt mật khẩu mạnh cho admin CTD ngay sau deploy. #54 và #55 (dump DB nằm trong git) là hai điều kiện tiên quyết, phải hoàn tất trước khi phát hành.

**Trên VM** (SSH, nạp công cụ ở 7.0, rồi `ut_tags production`):

5. Ghi lại tag đang chạy để còn lùi được và kiểm image cũ còn trên VM:
   ```bash
   B=/opt/ultimate-tckt/backups
   ut_tags production
   echo "core=$CORE_IMAGE_TAG ctd-api=$CTD_API_IMAGE_TAG"
   docker image ls --format '{{.Repository}}:{{.Tag}}' | grep -E "ultimate-tckt-(core|ctd-api):($CORE_IMAGE_TAG|$CTD_API_IMAGE_TAG)$"   # phải ra 2 dòng
   if [ -n "$CORE_IMAGE_TAG" ] && [ -n "$CTD_API_IMAGE_TAG" ] && [ "$CORE_IMAGE_TAG" != latest ] && [ "$CTD_API_IMAGE_TAG" != latest ]; then
     printf 'core=%s\nctd-api=%s\n' "$CORE_IMAGE_TAG" "$CTD_API_IMAGE_TAG" > "$B/keep-production-pre-release1-tags.txt"
     echo "đã ghi $B/keep-production-pre-release1-tags.txt"
   else
     echo "KHÔNG ghi: tag rỗng hoặc latest -> dừng"
   fi
   ```
   Tag là `latest` hoặc rỗng, hoặc không đủ 2 dòng image: dừng — không có bản để lùi; hỏi trưởng module. Chép hai tag vào issue phát hành
   (tag không phải secret); 7.6 đọc lại chúng từ file `keep-production-pre-release1-tags.txt`. `ghcr-cleanup` chỉ giữ 40 bản mới nhất mỗi package
   (staging và production dùng chung), nên bản cũ có thể đã bị xoá khỏi GHCR; ảnh trong cache của VM mới là chỗ chắc chắn.
6. G3: kiểm `.env` production và dữ liệu hiện có.
   ```bash
   v="$(sed -n 's/^CORE_DEVOPS_EMAILS=//p' /opt/ultimate-tckt/production/infra/.env | tail -n 1 | tr -d "[:space:]\"'")"
   if [ -n "$v" ]; then echo "CORE_DEVOPS_EMAILS: CÓ giá trị -> chưa đạt G3"; else echo "CORE_DEVOPS_EMAILS: rỗng -> đạt G3"; fi
   unset v
   ```
   Có giá trị thì dừng và đưa ra họp; không in giá trị ra, không dán vào issue. Chỉ khi nhóm đồng ý mới đặt rỗng trong `.env`
   (sao lưu file trước, giữ quyền `600`, không đưa ra khỏi VM).
   ```bash
   core_sql production "SELECT COUNT(*) AS cot_is_devops FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_devops';"
   core_sql production "SELECT COUNT(*) AS tai_khoan_mau FROM users WHERE email = 'admin@example.com';"
   ```
   `cot_is_devops` phải là `0`. Nếu là `1`, migration sẽ tạo membership DYC cho mọi người có `is_devops = 1`: chạy
   `core_sql production "SELECT COUNT(*) FROM users WHERE is_devops = 1;"`, phải ra `0`, nếu không thì dừng. `tai_khoan_mau` phải là
   `0` (tài khoản mẫu của `core/db.sql`, hash mật khẩu của nó nằm trong git công khai; việc a4 của SPEC-PILOT-001); khác 0 thì dừng và
   đưa ra họp.
7. Mốc dữ liệu trước phát hành, ghi vào issue phát hành để so sau phát hành và sau rollback:
   ```bash
   core_sql production "SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM teams) AS teams, (SELECT COUNT(*) FROM activities) AS activities, (SELECT COUNT(*) FROM tasks) AS tasks, (SELECT COUNT(*) FROM documents) AS documents, (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()) AS so_bang;"
   core_sql production "SELECT role, COUNT(*) AS so_nguoi FROM users GROUP BY role;"
   ```
   Phải có ít nhất một `admin`: sau phát hành quyền đọc từ membership, mà membership TCKT được sao chép từ `users.role`.
8. Backup, kiểm backup, và giữ riêng một bản không bị xoay vòng:
   ```bash
   df -h /opt/ultimate-tckt | tail -n 1            # còn dư chỗ cho hai file dump
   bash /opt/ultimate-tckt/production/infra/scripts/backup.sh production
   B=/opt/ultimate-tckt/backups
   CORE_DUMP="$(ls -1t "$B"/production-*-core.sql.gz | head -n 1)"
   CTD_DUMP="$(ls -1t "$B"/production-*-ctd.sql.gz | head -n 1)"
   gunzip -t "$CORE_DUMP" && gunzip -t "$CTD_DUMP" && echo "gzip nguyên vẹn"
   gunzip -c "$CORE_DUMP" | tail -n 2                   # phải thấy "-- Dump completed on ..."
   gunzip -c "$CORE_DUMP" | grep -c '^CREATE TABLE'     # phải bằng so_bang ở bước 7
   gunzip -c "$CTD_DUMP" | tail -n 2                    # phải thấy "-- PostgreSQL database dump complete"
   cp -p "$CORE_DUMP" "$B/keep-production-pre-release1-core.sql.gz"
   cp -p "$CTD_DUMP" "$B/keep-production-pre-release1-ctd.sql.gz"
   ```
   `backup.sh` giữ 14 bản theo mẫu `production-*`; hai bản `keep-…` nằm ngoài mẫu nên không bị xoá. Dump chứa dữ liệu thật: không chép
   ra ngoài VM, không đưa vào repo (repo là public). Phải có `ut_tags production` (bước 5) trong phiên này, vì `backup.sh` dùng compose.
9. G5: chạy checklist 7.4 trên **staging** (miền `-staging`), sau khi các job deploy của lần chạy `deploy` mới nhất trên `staging`
   xanh. Ghi kết quả vào issue phát hành.

Bước nào không đạt thì dừng; không có ngoại lệ kiểu "merge rồi sửa sau".

### 7.3 Merge (G6)

1. Mở PR `staging → main` trên GitHub. Tiêu đề `release: đợt 1 (staging → main)`; mô tả liệt kê G1–G6, `STAGING_SHA`, tag cũ (bước 5)
   và link #54, #55.
2. Chờ check bắt buộc của ruleset `protect-main`: `changes`, `test-core`, `test-ctd`, `docs`.
3. Merge bằng nút **Create a merge commit**. Không "Squash and merge", không "Rebase and merge". Nếu nút mặc định đang là squash, đổi lại
   trước khi bấm.
4. Theo dõi tab Actions của lần chạy `deploy` trên `main`: `changes` → `test-*` → `build-core`, `build-ctd-api` → `deploy-core`,
   `deploy-ctd-api`; `infra` chạy song song và không chờ test (mục 1–2). `deploy-noti` không chạy trên production. Chờ **tất cả** xong
   rồi mới sang 7.5.
5. `deploy-core` đỏ vì health check quá 60 giây ở lần đầu (Core chạy migration trước khi mở cổng): đừng bấm deploy lại ngay; làm
   7.5 bước 2. Thấy dòng `TCKT Activity Hub running on port` thì Core đã lên bình thường: ghi nhận job đỏ, không rollback. Thấy lỗi
   migration hoặc container `Restarting` liên tục thì sang 7.6.

### 7.4 Checklist smoke

Chạy trên staging trước khi merge (G5) và trên production sau khi deploy. Dựa trên SPEC-PILOT-001 §7.3, chỉnh theo code hiện tại.

```bash
H=tckt-hub.duckdns.org            # staging: tckt-hub-staging.duckdns.org
curl -fsS "https://$H/api/health"; echo
curl -fsS "https://$H/api/version"; echo
curl -fsS "https://ctd-hoso.duckdns.org/api/health"; echo     # staging: ctd-hoso-staging.duckdns.org
```

1. Hai `health` trả 200. `/api/version` chỉ trả version của `core/package.json` và một chuỗi build cố định, **không** có SHA: kiểm bản đang
   chạy bằng tag container (`ut_current_tag <env> core` so với SHA, xem 7.5 bước 1).
2. Đăng nhập bằng một tài khoản member và một tài khoản admin của TCKT. Sau phát hành quyền đọc từ membership: không vào được hoặc
   nhận 403 nghĩa là thiếu membership (xem 7.5 bước 4).
3. Tạo đề xuất hoạt động → admin thấy thông báo trong app (chuông) → duyệt → người đề xuất thấy thông báo.
4. Giao task → nhận → nộp duyệt kèm ảnh → duyệt. Nginx chưa đặt `client_max_body_size` (R13, SPEC-REL-001): ảnh lớn hơn 1 MB nhận
   413. Cho tới khi R13 được sửa, thử với ảnh nhỏ hơn 1 MB và ghi 413 ở ảnh lớn là lỗi đã biết, không chặn đợt 1.
5. Xuất Excel báo cáo.
6. Không có lỗi mới trong log Core. Core ghi log vào file trong container, không phải stdout:
   ```bash
   C=ultimate-tckt-production-core-1               # staging: ultimate-tckt-staging-core-1
   docker exec "$C" sh -c 'grep -c " — ERROR" /app/log.md; true'    # số lỗi từ lúc container khởi động; phải là 0
   docker logs --since 10m "$C" 2>&1 | tail -n 20
   ```
   Trên production, bộ nhắc hạn ghi các dòng `info` mỗi 15 phút vì chưa có Noti (R12): không phải lỗi.

### 7.5 Sau khi merge (production)

1. G6 và tag đã deploy. **Trên máy dev:**
   ```bash
   git fetch origin
   git merge-base --is-ancestor "$STAGING_SHA" origin/main && echo "G6 đạt: staging là tổ tiên của main" || echo "G6 HỎNG"
   git rev-list --parents -n 1 origin/main | wc -w        # 3 = một commit merge (commit + hai cha)
   git rev-parse --short=12 origin/main                   # = MERGE12
   ```
   **Trên VM:** cả hai tag phải bằng `MERGE12` (đợt này đổi cả Core lẫn CTD):
   ```bash
   ut_current_tag production core
   ut_current_tag production ctd-api
   ```
2. Container và log khởi động:
   ```bash
   docker ps --filter name=ultimate-tckt-production --format '{{.Names}}  {{.Status}}'
   docker logs --tail 50 ultimate-tckt-production-core-1 2>&1 | grep -E 'running on port|rror'
   ```
   Bốn container (`core`, `ctd-api`, `core-db`, `ctd-db`) phải `Up`, không `Restarting`; phải thấy `TCKT Activity Hub running on port`.
   Thấy lỗi migration hoặc `Restarting` thì sang 7.6.
3. `health` qua miền thật: đoạn `curl` ở 7.4 với miền production.
4. G3 và dữ liệu sau migration:
   ```bash
   ut_tags production
   core_sql production "SELECT 'users' AS muc, COUNT(*) AS so FROM users UNION ALL SELECT 'org_units', COUNT(*) FROM org_units UNION ALL SELECT 'membership_TCKT', COUNT(*) FROM unit_memberships m JOIN org_units o ON o.id = m.unit_id WHERE o.code = 'TCKT' UNION ALL SELECT 'membership_ngoai_TCKT', COUNT(*) FROM unit_memberships m JOIN org_units o ON o.id = m.unit_id WHERE o.code <> 'TCKT';"
   core_sql production "SELECT name FROM platform_migrations ORDER BY name;"
   docker exec ultimate-tckt-production-core-1 sh -c 'if [ -n "$(printf %s "$DEVOPS_EMAILS" | tr -d "[:space:]")" ]; then echo "DEVOPS_EMAILS: CÓ giá trị -> G3 bị phá"; else echo "DEVOPS_EMAILS: rỗng -> đạt G3"; fi'
   ```
   Kỳ vọng: `org_units` = 7; `membership_TCKT` = `users` (và bằng `users` ở mốc 7.2 bước 7); `membership_ngoai_TCKT` = 0; ba marker
   `devops_to_dyc_membership_v1`, `dyc_bootstrap_from_env_v1`, `multi_unit_backfill_v1`; `DEVOPS_EMAILS` rỗng. `membership_ngoai_TCKT` khác 0 nghĩa là
   G3 bị phá: dừng mọi thao tác thêm thành viên, báo họp, xem 7.6.
5. Chạy checklist 7.4 trên **production**.
6. Đặt mật khẩu admin CTD ngay (#54). Cho tới lúc này mật khẩu admin CTD vẫn là mật khẩu mặc định công khai do seed cũ đặt ở lần khởi
   động trước:
   ```bash
   CTD_ADMIN_EMAIL="$(sed -n 's/^ADMIN_EMAIL = "\(.*\)"$/\1/p' /opt/ultimate-tckt/production/services/ctd-api/backend/app/seeds/admin_seed.py)"
   docker exec -it ultimate-tckt-production-ctd-api-1 python -m app.seeds.set_password "$CTD_ADMIN_EMAIL"
   ```
   Nhập mật khẩu mới tại dấu nhắc (không hiện ra, không vào lịch sử shell); lưu vào kho mật khẩu của nhóm. Sau đó thử đăng nhập CTD bằng
   mật khẩu mặc định cũ: phải bị từ chối.
7. Đồng bộ ngược bằng PR `main → staging` (`../playbooks/hotfix-production.md` bước 7) để `git log origin/staging..origin/main` về rỗng. Lưu ý: ngay sau khi merge commit `staging → main`, nhánh `origin/staging` chưa chứa commit merge này, do đó `main` CHƯA phải là tổ tiên của `staging`. Chỉ sau khi merge PR đồng bộ ngược `main → staging` thì hai nhánh mới hoàn toàn khớp lịch sử (`main` trở thành tổ tiên của `staging`).
8. Ghi kết quả vào issue phát hành: thời điểm, `MERGE12`, kết quả bước 1–6. Không dán secret, không dán email người dùng thật.

### 7.6 Rollback

| Triệu chứng | Làm |
|---|---|
| Core lỗi nhưng dữ liệu nguyên (500, container khởi động lại do lỗi code) | A: lùi image Core |
| Migration lỗi, Core không lên | Đọc log (7.5 bước 2). Migration chỉ thêm và chạy lại được, thường sửa tiến rồi deploy lại; cần dịch vụ ngay thì A. Hiếm khi phải restore DB |
| Dữ liệu sai hoặc mất sau phát hành | B: restore DB (nặng; mất dữ liệu ghi sau thời điểm backup) |
| `membership_ngoai_TCKT` khác 0 hoặc lộ dữ liệu giữa đơn vị | Dừng thao tác, báo họp; A nếu cần chặn đường vào |

**A. Lùi image (nhanh, không đụng DB).** Dùng tag đã ghi ở 7.2 bước 5 (đọc lại từ file, không gõ tay):

```bash
T=/opt/ultimate-tckt/backups/keep-production-pre-release1-tags.txt
OLD_CORE_TAG="$(sed -n 's/^core=//p' "$T")"
OLD_CTD_TAG="$(sed -n 's/^ctd-api=//p' "$T")"
echo "lùi Core về: $OLD_CORE_TAG"
[ -n "$OLD_CORE_TAG" ] || echo "không đọc được tag -> dừng, lấy tag từ issue phát hành"
bash /opt/ultimate-tckt/production/infra/scripts/deploy.sh production core "$OLD_CORE_TAG"
```

Nếu `deploy.sh` dừng vì không `pull` được tag cũ (GHCR đã dọn, R16), dùng ảnh còn trong cache của VM (cùng phiên, giữ `OLD_CORE_TAG`):

```bash
ut_tags production
export CORE_IMAGE_TAG="$OLD_CORE_TAG"
ut_compose production up -d --no-deps core
ut_health http://127.0.0.1:3001/api/health && echo "Core đã lên"
```

- Bản Core cũ chạy được trên DB đã migrate: migration chỉ thêm bảng/cột (luật pilot, SPEC-PILOT-001 §9.3) và `unit_id` có mặc định TCKT.
  Lùi image không cần restore DB.
- Lùi `ctd-api` (cùng lệnh `deploy.sh`, đổi `core` thành `ctd-api` và `$OLD_CORE_TAG` thành `$OLD_CTD_TAG`) chạy lại seed cũ: **mật khẩu admin CTD bị đặt về mật khẩu mặc định công khai (#54)** ở
  mỗi lần khởi động. Chỉ lùi `ctd-api` khi thật cần và chạy lại 7.5 bước 6 ngay sau đó. Đợt này không có migration Alembic.
- `main` vẫn chứa bản lỗi: push kế tiếp lên `main` sẽ deploy lại nó. Trước khi lùi, nhờ người có quyền admin repo đặt biến
  `PROD_DEPLOY_ENABLED` = `false` (GitHub → Settings → Variables), sửa tiến bằng hotfix (`../playbooks/hotfix-production.md`), rồi bật lại
  ngay trước khi merge hotfix.

**B. Restore DB (hiếm — phương án khắc phục sự cố khẩn cấp cuối cùng, CẤM CHẠY NHƯ BƯỚC KIỂM THỬ THƯỜNG QUY).**
Lệnh restore có `DROP DATABASE` là hành động rủi ro cao nhất làm mất toàn bộ dữ liệu phát sinh sau mốc backup. Tuyệt đối **cấm chạy lệnh này như một bước kiểm thử** trong quy trình phát hành thông thường; chỉ áp dụng khi xảy ra sự cố hỏng hóc dữ liệu nghiêm trọng không thể khắc phục và đã được Trưởng nhóm/Chỉ đạo phát hành phê duyệt bằng văn bản. Dump sau không xoá các bảng do migration mới tạo, nên **không** restore đè lên DB đã migrate: tạo lại DB trống rồi nạp:

```bash
ut_tags production
B=/opt/ultimate-tckt/backups
OLD_CORE_TAG="$(sed -n 's/^core=//p' "$B/keep-production-pre-release1-tags.txt")"
echo "bản cũ: $OLD_CORE_TAG"
# 1. Dừng Core để không ghi thêm
ut_compose production stop core
# 2. Backup trạng thái HIỆN TẠI, kể cả khi đang lỗi
bash /opt/ultimate-tckt/production/infra/scripts/backup.sh production
# 3. Tạo lại DB trống (user ứng dụng giữ nguyên quyền)
ut_compose production exec -T core-db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE \`$MYSQL_DATABASE\`; CREATE DATABASE \`$MYSQL_DATABASE\`;"'
# 4. Nạp bản trước phát hành (không có bảng của migration mới)
gunzip -c "$B/keep-production-pre-release1-core.sql.gz" | ut_compose production exec -T core-db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
# 5. Chạy lại Core bản cũ
bash /opt/ultimate-tckt/production/infra/scripts/deploy.sh production core "$OLD_CORE_TAG"
```

Sau đó so mốc 7.2 bước 7 (`users`, `teams`, `activities`, `tasks`, `documents`: không nhiều hơn mốc; ít hơn chỉ vì dữ liệu ghi sau backup), chạy
checklist 7.4 và ghi vào issue. Chưa có script cho trình tự này và chưa có rollback tự động khi health check lỗi (R17): làm tay, từng bước,
kiểm kết quả giữa các bước. CTD không cần restore (không có migration trong đợt này).

**C. Không làm:**

- `git reset --hard`, `git checkout` lùi thư mục môi trường trên VM. Mã nguồn ở đó chỉ để lấy script và compose; lùi dịch vụ bằng tag image.
- `git revert` merge commit của đợt này trên `main`. Lần `staging → main` sau, Git coi các thay đổi đó đã được merge và **không mang lại**
  chúng. Cần gỡ code khỏi `main` thì sửa tiến bằng hotfix; nếu đã lỡ revert, phải revert chính commit revert trước khi phát hành lại.
- `docker compose down -v`, xoá volume `core_mysql` hoặc `ctd_postgres` (mất toàn bộ dữ liệu).
- Restore đè khi chưa backup trạng thái hiện tại, hoặc restore khi chưa dừng Core.
- Tuyệt đối không chạy lệnh `DROP DATABASE` trong B khi chưa có sự cố thực tế và phê duyệt bằng văn bản.
~~~

- [ ] **Step 4: Chạy lại `awk`/`grep` của Step 2 sau khi sửa mục 1, 2, 6** để chắc không mất tiêu đề:

```bash
grep -n '^## ' docs/ops/deploy-va-nhanh.md
grep -c '^### 7\.' docs/ops/deploy-va-nhanh.md
```

Kỳ vọng `7` mục con và tiêu đề từ `## 1.` đến `## 7.` rồi `## Lịch sử phiên bản`.

- [ ] **Step 5: Index và check.**

```bash
npm run docs:index
git add docs && git commit -q -m "docs(ops): release runbook for the first staging to main release" \
  -m "Rewrite OPS-DEPLOY-001 section 7: release gates G1-G6, pre-merge checks (incl. CORE_DEVOPS_EMAILS and is_devops), backup that is actually verified, merge-commit rule, post-deploy DB checks, smoke checklist and a rollback that restores into a clean database. Fix sections 1, 2 and 6 (the infra job does not wait for tests; Core logs live in the container). R24." \
  -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
npm run docs:check -- --base origin/staging
```

- [ ] **Step 6: Kiểm chứng nội dung runbook** (Review Focus 3 và 4). Cả bốn khối phải sạch:

```bash
bash <<'SH'
set -u
cd "$(git rev-parse --show-toplevel)"
f=docs/ops/deploy-va-nhanh.md
W="$(mktemp -d)"
# (a) cú pháp: trích mọi khối bash của mục 7 rồi bash -n
awk '/^## 7\. /{s=1} /^## Lịch sử phiên bản/{s=0} s' "$f" > "$W/s7.md"
awk -v dir="$W" '/^ *```bash$/{f=1;n++;next} /^ *```$/{f=0} f{print > (dir "/block" n ".sh")}' "$W/s7.md"
for b in "$W"/block*.sh; do bash -n "$b" || echo "LỖI CÚ PHÁP: $b"; done
echo "số khối bash: $(ls "$W"/block*.sh | wc -l)"
# (b) tên service/container/script có thật
grep -cE '^  (core-db|core|ctd-db|ctd-api):' infra/compose/docker-compose.production.yml      # kỳ vọng 4
ls infra/scripts/backup.sh infra/scripts/deploy.sh infra/scripts/lib.sh
grep -nE 'ut_current_tag\(\)|ut_compose\(\)|ut_health\(\)' infra/scripts/lib.sh                 # kỳ vọng 3 dòng
grep -n 'migrateOnStartup' core/src/runtime.js | head -n 2
grep -n 'MOI_TRUONG_DEV' services/ctd-api/backend/app/seeds/admin_seed.py | head -n 1
grep -n 'running on port' core/src/runtime.js
# (c) không có secret hay giá trị .env
grep -nE '(PASSWORD|SECRET|TOKEN|KEY)=[^ ]' "$f" || echo "không có VAR=giá trị"
# (d) những thứ sai của bản cũ đã biến mất; git reset --hard chỉ còn ở mục "Không làm"
grep -nE 'production/backups|ultimate_tckt |staging\.tckt|127\.0\.0\.1:3000|-f \.\./infra' "$f" || echo "không còn chuỗi sai của bản cũ"
grep -n 'git reset --hard' "$f"
SH
```

Kỳ vọng: không có `LỖI CÚ PHÁP`; số khối bash khoảng 20; `4`; các `ls`/`grep` đều có kết quả; `không có VAR=giá trị`; `không còn chuỗi sai của bản
cũ`; và `git reset --hard` chỉ xuất hiện đúng một dòng, trong mục "Không làm" của 7.6.

- [ ] **Step 7 (tuỳ chọn, cần người có quyền SSH và đồng ý của người dùng): diễn tập trên staging.** Chỉ lệnh đọc và `backup.sh staging`;
  không đụng production.

```bash
ssh ubuntu@168.107.68.32
source /opt/ultimate-tckt/staging/infra/scripts/lib.sh
# dán ut_tags và core_sql từ mục 7.0, rồi:
ut_tags staging
core_sql staging "SELECT COUNT(*) AS users FROM users;"
docker exec ultimate-tckt-staging-core-1 sh -c 'grep -c " — ERROR" /app/log.md; true'
bash /opt/ultimate-tckt/staging/infra/scripts/backup.sh staging
```

Kỳ vọng: `ut_tags` không báo thiếu biến, `core_sql` in một số, lệnh `grep -c` in một số, `backup.sh` ghi hai file `staging-…`. Nếu `backup.sh` báo
thiếu `CORE_IMAGE_TAG` dù đã `ut_tags` thì ghi lại và báo (script không nạp tag; thuộc PLAN-REL-002).

---

### Task 4: Gỡ `core/test-output.txt` và chặn tái phạm (R23)

**Files:**
- Delete: `core/test-output.txt` (176 dòng output test, bị commit nhầm)
- Modify: `core/.gitignore`
- Modify: `docs/planning/ke-hoach-hub-core-operations.md` (PLAN-HUB-001 có `related_code: [core/**, …]`, nên đổi hai file `core/` bắt buộc cập nhật nó)
- Modify: `docs/README.md` (sinh bởi `npm run docs:index`)

- [ ] **Step 1: Xác nhận đây là rác và không có chỗ nào dùng nó.**

```bash
git ls-files core/test-output.txt
head -n 5 core/test-output.txt
grep -niE 'password|secret|token|api[_-]?key' core/test-output.txt | head -n 5
git grep -n 'test-output' -- . ':!docs/specs' ; echo "exit=$?"
```

Kỳ vọng: file có tracked; mấy dòng đầu là output `node --test`; `grep` chỉ khớp **tên test** (không có giá trị secret); `git grep` không ra gì
(`exit=1`). Nếu `grep` ra giá trị trông như secret thì dừng, đừng commit và báo trưởng module.

- [ ] **Step 2: Xoá file và thêm luật ignore.**

```bash
git rm -q core/test-output.txt
[ -z "$(tail -c1 core/.gitignore)" ] || echo >> core/.gitignore
printf 'test-output.txt\n' >> core/.gitignore
git check-ignore -v core/test-output.txt
```

Kỳ vọng: `git check-ignore -v` in `core/.gitignore:N:test-output.txt	core/test-output.txt`.

- [ ] **Step 3: Cập nhật PLAN-HUB-001** (dùng lại hàm của Task 2; nếu thiếu file hàm, chạy lại Task 2 Step 1):

```bash
bash <<'SH'
set -euo pipefail
source "${TMPDIR:-/tmp}/docs-fix-lib.sh"
cd "$(git rev-parse --show-toplevel)"
f=docs/planning/ke-hoach-hub-core-operations.md
new="$(bump "$f")"
append_history "$f" "| $new | $TODAY | Dọn \`core/test-output.txt\` (output test commit nhầm) và thêm vào \`core/.gitignore\`; không đổi nội dung kế hoạch | DYC |"
echo "PLAN-HUB-001 -> $new"
SH
```

- [ ] **Step 4: Index, commit, check.**

```bash
npm run docs:index
git add core/.gitignore docs          # việc xoá core/test-output.txt đã được stage bởi git rm; không git add đường dẫn đó (nay bị ignore)
git status --short                    # kỳ vọng: D core/test-output.txt, M core/.gitignore, các file docs
git commit -q -m "chore(core): drop stray test-output.txt and ignore it" \
  -m "176 lines of node --test output were committed by mistake (R23). Remove it and ignore the name; bump PLAN-HUB-001 because core/** is in its related_code." \
  -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
npm run docs:check -- --base origin/staging
npm run docs:check -- --base origin/main 2>&1 | grep -v '^fatal'
git status --short
```

Kỳ vọng: cả hai `docs:check` xanh; `git status` sạch. CI sẽ build và deploy Core staging một lần sau khi PR merge (không đổi hành vi).

---

### Task 5: Sửa bốn tài liệu vận hành sai (R25)

**Files:**
- Modify: `docs/playbooks/rollback.md` (PB-RB-001: 1.1 → 1.2)
- Modify: `docs/playbooks/hotfix-production.md` (PB-HOT-001: 1.2 → 1.3)
- Modify: `docs/ops/moi-truong.md` (OPS-ENV-001: 1.3 → 1.4)
- Modify: `docs/dev/db-migration.md` (DEV-DB-001: 2.1 → 2.2)
- Modify: `docs/ops/backup-restore.md` (OPS-BAK-001: 1.1 → 1.2; thêm ngoài danh sách R25 vì sau runbook mới, câu "restore đè được" ở đó sẽ mâu thuẫn)
- Modify: `docs/README.md` (sinh bởi `npm run docs:index`)

Mỗi cặp `old`/`new` dưới đây thay đúng nguyên văn; nếu version của file khác dự kiến thì tăng MINOR từ giá trị hiện có.

#### 5a. `rollback.md`: chạy được từ thư mục bất kỳ

- [ ] **Step 1: Sửa `rollback.md`.**

~~~text old:t5-rb-fm
version: 1.1
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-02
~~~

~~~markdown new:t5-rb-fm
version: 1.2
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-03
~~~

~~~text old:t5-rb-1
Tìm tag image chạy tốt trước đó (12 ký tự đầu SHA commit, xem lịch sử Actions hoặc tag trên GHCR), rồi:

```bash
infra/scripts/deploy.sh <staging|production> <core|ctd-api|noti> <tag-cu>   # noti: chỉ staging
```
~~~

~~~markdown new:t5-rb-1
Các lệnh dưới đây chạy **trên VM** (SSH vào, xem [`../ops/deploy-va-nhanh.md`](../ops/deploy-va-nhanh.md) mục 5), từ thư mục nào cũng được: dùng đường dẫn tuyệt đối, vì `infra/scripts/` chỉ tồn tại bên trong thư mục môi trường.

Tìm tag image chạy tốt trước đó (12 ký tự đầu SHA commit, xem lịch sử Actions hoặc tag trên GHCR; với đợt phát hành, tag cũ đã được ghi lại ở bước chuẩn bị, mục 7.2 của tài liệu trên), rồi:

```bash
bash /opt/ultimate-tckt/<staging|production>/infra/scripts/deploy.sh <staging|production> <core|ctd-api|noti> <tag-cu>   # noti: chỉ staging
```
~~~

~~~text old:t5-rb-1b
`deploy.sh` tự pull đúng tag, `up -d --no-deps` chỉ service của app đó (`noti` = `noti-api` + `noti-worker`), và chạy health check `http://127.0.0.1:<port>/api/health` (Noti: `:8100/v1/health`) — script tự thoát với exit code khác 0 nếu health check thất bại, không âm thầm coi là thành công.
~~~

~~~markdown new:t5-rb-1b
`deploy.sh` tự pull đúng tag, `up -d --no-deps` chỉ service của app đó (`noti` = `noti-api` + `noti-worker`), và chạy health check `http://127.0.0.1:<port>/api/health` (Noti: `:8100/v1/health`) — script tự thoát với exit code khác 0 nếu health check thất bại, không âm thầm coi là thành công. Nó **không** tự lùi khi health check lỗi: container lỗi vẫn nằm đó cho tới khi bạn deploy lại một tag tốt.

**Lùi image không lùi dữ liệu.** Theo luật pilot (SPEC-PILOT-001 §9.3) migration của Core chỉ thêm bảng/cột nên bản Core cũ chạy được trên DB đã migrate; không cần restore DB chỉ vì lùi image (trừ khi migration của bản đó phá luật này). Lùi `ctd-api` về bản trước khi sửa seed admin (#54) thì mỗi lần khởi động seed lại đặt mật khẩu admin CTD về mật khẩu mặc định công khai: chỉ lùi khi thật cần, rồi đặt lại mật khẩu bằng `python -m app.seeds.set_password` (xem mục 7.5 và 7.6 của tài liệu trên). Nếu `main` vẫn chứa bản lỗi, lần push sau lên `main` sẽ deploy lại bản lỗi: tạm tắt biến repo `PROD_DEPLOY_ENABLED` hoặc sửa tiến theo [`hotfix-production.md`](hotfix-production.md).
~~~

~~~text old:t5-rb-2
git -C /opt/ultimate-tckt/<env> log --oneline -- infra/   # tìm commit infra trước đó
git -C /opt/ultimate-tckt/<env> checkout <commit-cu> -- infra/
infra/scripts/apply-infra.sh <env>
```

`apply-infra.sh` tự sao lưu cấu hình nginx đang dùng vào `$UT_ROOT/backups/nginx-<ts>/` trước khi áp bản mới, và từ chối reload nếu `nginx -t` báo lỗi cú pháp.
~~~

~~~markdown new:t5-rb-2
git -C /opt/ultimate-tckt/<env> log --oneline -- infra/   # tìm commit infra trước đó
git -C /opt/ultimate-tckt/<env> checkout <commit-cu> -- infra/
bash /opt/ultimate-tckt/<env>/infra/scripts/apply-infra.sh <env>
```

`apply-infra.sh` tự sao lưu cấu hình nginx đang dùng vào `$UT_ROOT/backups/nginx-<ts>/` trước khi áp bản mới, và từ chối reload nếu `nginx -t` báo lỗi cú pháp.

Đây chỉ là biện pháp tạm: thư mục `infra/` trên VM thành "đã sửa tay", mà `apply-infra.sh` và `deploy.sh` đều chạy `git pull --ff-only` nên sẽ từ chối nếu commit mới cũng đổi các file đó. Sau sự cố, đưa bản đúng vào git bằng PR (revert commit infra gây lỗi), rồi trên VM chạy `git -C /opt/ultimate-tckt/<env> checkout HEAD -- infra/` để bỏ thay đổi tay trước khi pull.
~~~

~~~text old:t5-rb-3
Chỉ khi rollback image/infra không đủ (dữ liệu đã bị hỏng bởi migration hoặc thao tác sai) — xem quy trình đầy đủ ở [`../ops/backup-restore.md`](../ops/backup-restore.md). Đây là bước nặng nhất, **luôn backup bản hiện tại trước khi restore đè lên**, kể cả khi bản hiện tại đang lỗi.
~~~

~~~markdown new:t5-rb-3
Chỉ khi rollback image/infra không đủ (dữ liệu đã bị hỏng bởi migration hoặc thao tác sai) — xem quy trình đầy đủ ở [`../ops/backup-restore.md`](../ops/backup-restore.md). Đây là bước nặng nhất, **luôn backup bản hiện tại trước khi restore đè lên**, kể cả khi bản hiện tại đang lỗi. Nếu DB đã chạy migration mới hơn bản backup (có bảng hoặc marker mà bản backup không có), restore đè lên DB đang có để lại các bảng thừa đó: tạo lại DB trống rồi mới nạp dump — trình tự đầy đủ, kèm kiểm tra, ở [`../ops/deploy-va-nhanh.md`](../ops/deploy-va-nhanh.md) mục 7.6.
~~~

~~~text old:t5-rb-hist
| 1.1 | 2026-10-02 | Rollback Noti (staging) | DYC |
~~~

~~~markdown new:t5-rb-hist
| 1.1 | 2026-10-02 | Rollback Noti (staging) | DYC |
| 1.2 | 2026-10-03 | Lệnh dùng đường dẫn tuyệt đối trên VM; lùi image không lùi dữ liệu; cảnh báo `infra/` bị sửa tay; restore vào DB sạch khi DB đã migrate | DYC |
~~~

#### 5b. `hotfix-production.md`: merge ngược qua PR

- [ ] **Step 2: Sửa `hotfix-production.md`.**

~~~text old:t5-hf-fm
version: 1.2
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-02
~~~

~~~markdown new:t5-hf-fm
version: 1.3
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-03
~~~

~~~text old:t5-hf-7
7. **Merge ngược `main → staging` ngay sau khi hotfix đã lên production** — bắt buộc, để `staging` không bị lệch lùi:
   ```bash
   git checkout staging && git pull
   git merge main
   git push origin staging
   ```
8. Nếu bước 7 có xung đột, giải quyết thủ công — không được bỏ qua bước merge ngược này dù xung đột khó.
~~~

~~~markdown new:t5-hf-7
7. **Merge ngược `main → staging` bằng PR ngay sau khi hotfix đã lên production** — bắt buộc, để `staging` không bị lệch lùi. Ruleset `protect-staging` chặn push thẳng (xem `docs/ops/github.md` mục 4), nên đi qua một nhánh đồng bộ:
   ```bash
   git fetch origin
   git switch -c "sync/main-to-staging-$(date +%Y%m%d)" origin/staging
   git merge --no-ff origin/main
   git push -u origin HEAD
   ```
   Mở PR từ nhánh `sync/main-to-staging-<ngày>` vào `staging` và merge bằng **merge commit** (không squash, không rebase — squash làm `main` lại có commit mà `staging` không có).
8. Nếu bước 7 có xung đột, giải quyết ngay trong nhánh đồng bộ (sửa, `git add`, `git commit`) rồi mới push — không được bỏ qua bước merge ngược này dù xung đột khó.
~~~

~~~text old:t5-hf-check
- [ ] `main` đã được merge ngược vào `staging` — chạy `git log staging..main` phải rỗng sau bước này.
~~~

~~~markdown new:t5-hf-check
- [ ] PR đồng bộ đã merge vào `staging` — sau `git fetch origin`, `git log origin/staging..origin/main` phải rỗng.
~~~

~~~text old:t5-hf-hist
| 1.2 | 2026-10-02 | Thêm `test-noti`; Noti chưa deploy production | DYC |
~~~

~~~markdown new:t5-hf-hist
| 1.2 | 2026-10-02 | Thêm `test-noti`; Noti chưa deploy production | DYC |
| 1.3 | 2026-10-03 | Merge ngược `main → staging` qua PR từ nhánh đồng bộ (ruleset chặn push thẳng `staging`); kiểm bằng `origin/` | DYC |
~~~

#### 5c. `moi-truong.md`: bỏ khẳng định SMTP/khoá mã hoá không có trong code

Bằng chứng (chạy ở Step 5): trong `core/src`, `core/app.js`, `core/public`, `core/package.json` không còn đọc `SETTINGS_ENCRYPTION_KEY`, không còn `settings-crypto`
và không còn mã SMTP (chỉ còn khoá catalog `email.smtp` trong `core/src/settings/catalog.js`); compose vẫn khai báo biến bắt buộc, nên thiếu nó `core` không lên.

- [ ] **Step 3: Sửa `moi-truong.md`.**

~~~text old:t5-env-fm
version: 1.3
status: active
audience: [dev, ops, ai]
owner: DYC
updated: 2026-10-02
~~~

~~~markdown new:t5-env-fm
version: 1.4
status: active
audience: [dev, ops, ai]
owner: DYC
updated: 2026-10-03
~~~

~~~text old:t5-env-para
**Lưu ý về `CORE_SETTINGS_ENCRYPTION_KEY`:** compose cũ (trước khi gộp monorepo) không khai báo biến này, nên trang **Setting → SMTP** trên core bị lỗi khi lưu cấu hình (khoá mã hoá không tồn tại). Compose mới (`infra/compose/docker-compose.<env>.yml`) đã thêm biến này bắt buộc (`${CORE_SETTINGS_ENCRYPTION_KEY:?}`) — thiếu biến thì container `core` không khởi động được thay vì âm thầm lỗi khi người dùng bấm Lưu. `bootstrap-vm.sh` tự sinh giá trị này (`openssl rand -base64 32`) nếu `.env` cũ chưa có. Mất khoá này = mất khả năng đọc lại cấu hình SMTP đã lưu trước đó (xem `docs/ai/bat-bien.md`).
~~~

~~~markdown new:t5-env-para
**Lưu ý về `CORE_SETTINGS_ENCRYPTION_KEY`:** compose (`infra/compose/docker-compose.<env>.yml`) vẫn khai báo biến này là bắt buộc (`${CORE_SETTINGS_ENCRYPTION_KEY:?}`) và truyền vào container `core` dưới tên `SETTINGS_ENCRYPTION_KEY`, nên thiếu biến thì `core` không khởi động được; `bootstrap-vm.sh` tự sinh giá trị (`openssl rand -base64 32`) nếu `.env` chưa có. Tuy nhiên **code Core hiện không đọc biến này**: không còn module mã hoá cấu hình, không còn trang cấu hình SMTP (email do Noti đảm nhận, mục 4a và 5), nên không có cấu hình SMTP nào được mã hoá bằng nó. Biến chỉ còn là di sản của compose, đã được ghi nhận để gỡ (R19 trong SPEC-REL-001). Đừng sinh lại hay đổi nó chỉ vì lo "mất khoá = mất cấu hình SMTP": điều đó không còn đúng.
~~~

~~~text old:t5-env-hist
| 1.3 | 2026-10-02 | Thêm `CORE_NOTI_API_KEY`; mục 4a: cách tạo key cho Core và bật gửi | DYC |
~~~

~~~markdown new:t5-env-hist
| 1.3 | 2026-10-02 | Thêm `CORE_NOTI_API_KEY`; mục 4a: cách tạo key cho Core và bật gửi | DYC |
| 1.4 | 2026-10-03 | Bỏ khẳng định sai về SMTP và khoá mã hoá cấu hình (code Core không còn dùng); biến chỉ còn là di sản của compose | DYC |
~~~

#### 5d. `db-migration.md`: Core migrate lúc khởi động

- [ ] **Step 4: Sửa `db-migration.md`.**

~~~text old:t5-db-fm
version: 2.1
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-27
~~~

~~~markdown new:t5-db-fm
version: 2.2
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-03
~~~

~~~text old:t5-db-37
- **Cách kiểm tra sau deploy**: chạy truy vấn `SELECT COUNT(*) FROM unit_memberships;` kết quả phải ≥ `SELECT COUNT(*) FROM users;`.
~~~

~~~markdown new:t5-db-37
- **Cách kiểm tra sau deploy**: chạy truy vấn `SELECT COUNT(*) FROM unit_memberships;` kết quả phải ≥ `SELECT COUNT(*) FROM users;`. Lệnh chạy trong container và các kiểm tra khác (số đơn vị, marker, membership ngoài TCKT): `docs/ops/deploy-va-nhanh.md` mục 7.5.
~~~

~~~text old:t5-db-sec
Migration DB **không** tự chạy trong `deploy.sh` (script đó chỉ pull image + up một service). Áp schema mới lên
staging/production đi qua `infra/scripts/apply-infra.sh <env> true` (tham số `apply_db=true` mới đụng tới
`core-db`/`ctd-db`) — chạy `backup.sh <env>` trước khi áp migration có khả năng phá dữ liệu (đổi kiểu cột, xoá
cột). Runbook đầy đủ: `docs/ops/deploy-va-nhanh.md`, `docs/ops/backup-restore.md`.
~~~

~~~markdown new:t5-db-sec
Migration của Core **tự chạy khi container `core` khởi động**: `core/src/runtime.js` (`migrateOnStartup`) gọi `migrateDatabase`
(kể cả `migrate-units.js`) trước khi mở cổng. Vì vậy mỗi lần `deploy.sh <env> core <tag>` tạo lại container `core` là một lần chạy
migration trên DB của môi trường đó; không có bước "áp migration" riêng. Migration lỗi thì Core ghi log (file `log.md` trong
container), in lỗi ra stdout rồi thoát mã 1, container tự khởi động lại (`restart: unless-stopped`) cho tới khi chạy được — Core
không phục vụ trên schema dở dang, và `deploy.sh` báo đỏ khi health check không qua trong 60 giây. Với CTD, container chạy
`alembic upgrade head` rồi `python -m app.seeds` trước khi `uvicorn` (`CMD` trong `services/ctd-api/Dockerfile`), nên revision mới
cũng được áp khi deploy `ctd-api`.

`infra/scripts/apply-infra.sh <env> true` **không** áp migration: tham số `apply_db=true` chỉ `up -d` thêm hai container
`core-db`/`ctd-db`. Chạy `backup.sh <env>` trước khi deploy bản có migration có khả năng phá dữ liệu (đổi kiểu cột, xoá cột) —
SPEC-PILOT-001 §9.3 cấm kiểu migration đó trong thời gian pilot; ghi rõ trong PR khi có migration để người phát hành backup. Runbook
đầy đủ: `docs/ops/deploy-va-nhanh.md` mục 7; sao lưu và khôi phục: `docs/ops/backup-restore.md`.
~~~

~~~text old:t5-db-hist
| 2.1 | 2026-09-27 | Thêm thông tin về migration đa đơn vị | D2 |
~~~

~~~markdown new:t5-db-hist
| 2.1 | 2026-09-27 | Thêm thông tin về migration đa đơn vị | D2 |
| 2.2 | 2026-10-03 | Sửa: migration Core tự chạy lúc khởi động container (không phải "không chạy khi deploy"); `apply_db=true` không áp migration | DYC |
~~~

#### 5e. `backup-restore.md`: tránh mâu thuẫn với runbook

- [ ] **Step 5: Sửa `backup-restore.md`.**

~~~text old:t5-bk-fm
version: 1.1
status: active
audience: [dev, ops, ai]
owner: DYC
updated: 2026-09-24
~~~

~~~markdown new:t5-bk-fm
version: 1.2
status: active
audience: [dev, ops, ai]
owner: DYC
updated: 2026-10-03
~~~

~~~text old:t5-bk-a
```bash
source /opt/ultimate-tckt/<env>/infra/scripts/lib.sh
```
~~~

~~~markdown new:t5-bk-a
```bash
source /opt/ultimate-tckt/<env>/infra/scripts/lib.sh
```

Compose đòi `CORE_IMAGE_TAG` và `CTD_API_IMAGE_TAG` (staging thêm `NOTI_IMAGE_TAG`) cho mọi lệnh, kể cả `exec`; `backup.sh` và lệnh gõ tay không tự nạp chúng. Nạp bằng hàm `ut_tags` ở [`deploy-va-nhanh.md`](deploy-va-nhanh.md) mục 7.0 trước khi chạy `backup.sh` hoặc các lệnh dưới đây.
~~~

~~~text old:t5-bk-b
nên restore đè lên DB đang có dữ liệu được.
~~~

~~~markdown new:t5-bk-b
nên restore đè lên DB đang có dữ liệu **cùng schema** được. Ngoại lệ: nếu DB hiện tại đã chạy migration mới hơn bản dump (có bảng hoặc marker mà dump không có — ví dụ rollback sau đợt phát hành đa đơn vị), dump không xoá các bảng thừa đó; tạo lại DB trống trước khi nạp: `ut_compose <env> exec -T core-db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE \`$MYSQL_DATABASE\`; CREATE DATABASE \`$MYSQL_DATABASE\`;"'` (dừng `core` trước; trình tự đầy đủ ở [`deploy-va-nhanh.md`](deploy-va-nhanh.md) mục 7.6).
~~~

~~~text old:t5-bk-hist
| 1.1 | 2026-09-24 | Restore: nạp `lib.sh` trước, dump Postgres có `--clean --if-exists`, cách restore dump cũ | DYC |
~~~

~~~markdown new:t5-bk-hist
| 1.1 | 2026-09-24 | Restore: nạp `lib.sh` trước, dump Postgres có `--clean --if-exists`, cách restore dump cũ | DYC |
| 1.2 | 2026-10-03 | Compose đòi tag image: nạp bằng `ut_tags`; DB đã migrate mới hơn dump phải tạo lại DB trống trước khi nạp | DYC |
~~~

- [ ] **Step 6: Đối chiếu từng khẳng định với code** (Review Focus 5). Mọi lệnh phải cho kết quả như kỳ vọng:

```bash
# moi-truong: code Core không đọc khoá mã hoá và không có mã SMTP
grep -rniE 'SETTINGS_ENCRYPTION|settings-crypto|nodemailer' core/src core/app.js core/public core/package.json || echo "không có trong code Core"
grep -rniE '\bsmtp\b' core/src core/app.js core/public | grep -v 'email.smtp' || echo "không có mã SMTP (chỉ khoá catalog email.smtp)"
ls core/src/config/settings-crypto.js 2>&1 | tail -n 1                        # No such file
grep -n 'CORE_SETTINGS_ENCRYPTION_KEY' infra/compose/docker-compose.production.yml infra/compose/docker-compose.staging.yml infra/scripts/bootstrap-vm.sh | head -n 4
# db-migration: Core migrate lúc khởi động; CTD chạy alembic trong CMD
grep -n 'migrateOnStartup' core/src/runtime.js | head -n 3
grep -n 'process.exit(1)' core/app.js
grep -n 'restart:' infra/compose/docker-compose.production.yml | head -n 2
grep -n 'CMD' services/ctd-api/Dockerfile
grep -n 'APPLY_DB' infra/scripts/apply-infra.sh
# hotfix: ruleset staging chặn push thẳng
grep -n 'push thẳng' docs/ops/github.md
# cú pháp các khối bash vừa thêm (rollback, hotfix)
for f in docs/playbooks/rollback.md docs/playbooks/hotfix-production.md; do
  W="$(mktemp -d)"; awk -v dir="$W" '/^ *```bash$/{f=1;n++;next} /^ *```$/{f=0} f{print > (dir "/b" n ".sh")}' "$f"
  for b in "$W"/b*.sh; do sed -e 's/<[^>]*>/X/g' "$b" | bash -n || echo "LỖI CÚ PHÁP trong $f ($b)"; done
done
```

Kỳ vọng: hai dòng đầu in `không có trong code Core` và `không có mã SMTP …`; `ls` báo `No such file or directory`; compose và `bootstrap-vm.sh`
có `CORE_SETTINGS_ENCRYPTION_KEY`; `runtime.js` có `migrateOnStartup`; `app.js` có `process.exit(1)`; `restart: unless-stopped`; `CMD` có
`alembic upgrade head`; `apply-infra.sh` có `APPLY_DB`; `github.md` có "push thẳng"; không có `LỖI CÚ PHÁP`. Khẳng định nào không khớp thì
sửa lại tài liệu cho đúng với code, không sửa code. (Các `<…>` được đổi thành `X` chỉ để `bash -n` đọc được.)

- [ ] **Step 7: Index, commit, check.**

```bash
npm run docs:index
git add docs && git commit -q -m "docs: fix rollback, hotfix, environment and migration docs" \
  -m "rollback.md: absolute paths and clean-DB restore; hotfix-production.md: merge main back via PR (protect-staging blocks direct push); moi-truong.md: drop the SMTP/encryption-key claims the code no longer backs; db-migration.md: Core migrates on container start; backup-restore.md: image tags and clean DB. R25." \
  -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
npm run docs:check -- --base origin/staging
```

#### Việc cần họp (không làm trong plan này)

Hai chỗ khác còn nhắc khoá mã hoá cấu hình: `docs/ai/bat-bien.md` (bất biến số 3, "khoá mã hoá cấu hình SMTP") và `docs/ai/tim-o-dau.md`
(dòng "Mã hoá secret cấu hình" trỏ `core/src/config/settings-crypto.js`, file này không còn). Sửa bất biến là thay đổi hợp đồng dùng chung
(`AGENTS.md` mục 3) nên **raise họp team** theo `.github/ISSUE_TEMPLATE/cross-module.md`, cùng với việc gỡ biến thừa của R19. Cho tới khi đó `moi-truong.md` nói
đúng với code còn `bat-bien.md` lỗi thời; ghi chú này nằm trong báo cáo kèm PR. Các tài liệu còn nhắc biến (`su-co.md`, `vps.md`, `ban-giao.md`, `chay-local.md`)
vẫn đúng vì compose còn đòi biến; khi R19 gỡ biến phải sửa cùng lúc.

---

### Task 6: Đóng PR #43 theo SPEC-PILOT-001 §9.9 (R26)

**Không phải commit.** Đóng PR là thao tác công khai, không hoàn tác được ý nghĩa với tác giả: **chỉ làm sau khi người dùng xác nhận bằng lời
trong chat** (không suy từ việc plan được giao). Không xoá nhánh.

**Files:** không có. Chỉ GitHub: PR #43 (`feat/dev1-migration-schema → main`).

- [ ] **Step 1: Đọc lại trạng thái (chỉ đọc).**

```bash
gh pr view 43 --json number,title,state,headRefName,baseRefName,mergeable,mergeStateStatus,changedFiles,additions,deletions
```

Ghi nhận khi viết plan (2026-10-03): `OPEN`, đích `main`, 111 file, +11091/−1565, `MERGEABLE`/`CLEAN` (không còn xung đột). Vì vậy **không** nói
"xung đột" trong lời nhắn; lý do đóng là: đích `main` bỏ qua `staging`, trùng phạm vi PR #28/#29 đã vào `staging`, và SPEC-PILOT-001 §9.9 đã quyết làm lại. Rủi ro
nếu để mở: một cú bấm merge đưa 11 nghìn dòng thẳng lên production, bỏ qua `staging` và smoke.
Nếu `state` không còn `OPEN`, dừng task này.

- [ ] **Step 2: Soạn lời nhắn và xin xác nhận.** Gửi cho người dùng nguyên văn lời nhắn dưới đây và hỏi: "Đóng PR #43 với lời nhắn này, không xoá nhánh. Đồng ý không?"

```text
Đóng PR này theo quyết định ở SPEC-PILOT-001 §9 mục 9 (docs/specs/2026-09-29-pilot-dieu-hanh-design.md).

Lý do: PR nhắm thẳng vào `main`, bỏ qua `staging` (luồng là nhánh tính năng → staging → main), và phạm vi chồng lên PR #28/#29 đã merge vào `staging`. Để PR mở thì chỉ cần một lần bấm merge là 111 file đi thẳng lên production.

Việc tiếp theo: làm lại trên `staging`, chỉ giữ `migrateDevopsToMembership`. Phần tái dùng được (units routes, audit, setting-guard, Rule Engine) nằm ở `origin/archive/gd1a-staging`.

Cảm ơn bạn đã làm phần này. Nhánh `feat/dev1-migration-schema` được giữ nguyên, không bị xoá.
```

- [ ] **Step 3: Chỉ sau khi người dùng nói rõ "đồng ý"**, đóng PR kèm lời nhắn (lưu lời nhắn vào file tạm ngoài repo rồi dùng `--comment`):

```bash
gh pr close 43 --comment "$(cat "${TMPDIR:-/tmp}/pr43-comment.txt")"
gh pr view 43 --json state,closedAt --jq '"\(.state) \(.closedAt)"'
```

Kỳ vọng: `CLOSED <thời điểm>`. Không có `--delete-branch`. Báo lại cho người dùng.

- [ ] **Step 4: Nếu người dùng không đồng ý hoặc chưa trả lời:** không làm gì, ghi vào báo cáo "R26 chưa xử lý — chờ xác nhận". PR mở không chặn phát hành (G1–G6) nhưng nhắc người
  phát hành không bấm merge nó.

---

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-03 | Bản đầu: sáu task (PB-DEP-001 cho G2, sửa chín dòng lịch sử lỗi mã hoá, runbook phát hành đợt 1 trong OPS-DEPLOY-001 4.0, dọn `test-output.txt`, sửa bốn tài liệu vận hành sai, đóng PR #43) | DYC |
| 1.1 | 2026-10-03 | Cập nhật runbook §7: #54 và #55 là điều kiện tiên quyết trước release; quy trình đồng bộ PR `main → staging` sau merge commit; cảnh báo cấm chạy restore DB có `DROP DATABASE` như kiểm thử | DYC |
| 1.2 | 2026-10-03 | Đính chính: khối runbook §7 và rollback trong plan lỗi thời so với OPS-DEPLOY-001 4.1 (rollback `ctd-api` trước #54, tag theo từng dịch vụ, nghiệm thu O1/O2) | DYC |
