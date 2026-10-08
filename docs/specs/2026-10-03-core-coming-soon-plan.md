---
doc_id: PLAN-SOON-001
title: Plan — màn hình "Đang phát triển" cho UI Core legacy
version: 1.1
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-08
related_code: [core/public/**, core/tests/frontend.contract.test.js]
---

# Màn hình "Đang phát triển" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay trang 503, nút chưa có và hash lạ trong UI Core legacy bằng một màn hình "Đang phát triển" vui nhộn,
dùng chung cho sáu chỗ.

**Architecture:** Toàn bộ chạy ở client trong `core/public/`. Một bảng nội dung `COMING_SOON` cộng một bộ dựng HTML
`comingSoonView(key, options)`, hiển thị dạng trang (`showComingSoon`, gọi từ `route()`) hoặc dạng modal
(`comingSoonModal`, gọi qua thuộc tính `data-soon` nhờ một trình nghe click uỷ quyền).

**Tech Stack:** JavaScript thuần (không build), CSS tokens trong `styles.css`, icon Phosphor, `node:test`.

**Spec:** `docs/specs/2026-10-03-core-coming-soon-design.md`

## Global Constraints

- Chỉ sửa `core/public/**`, `core/tests/frontend.contract.test.js`, `docs/**`. Không đụng `/api/session`, setting, route backend.
- Câu chính VI: "Tính năng này đang được phát triển." + "Chúng tôi đã chích điện dev để đẩy nhanh tiến độ."
- Câu chính EN: "This feature is under development." + "We've tased the devs to speed things up."
- Thanh sạc khởi điểm ngẫu nhiên 30–70%, mỗi lần chích +5–12%, dừng ở 99%.
- Không có chuỗi "sang Cam". Linh vật là SVG tự vẽ.
- `index.html` không chứa ký tự `→` hoặc `×`. CSS không dùng `content` có chữ.
- Màu chỉ dùng token có sẵn (`--ink`, `--paper`, `--orange`, `--blue`, `--muted`, `--surface-raised`, `--line`…).

## Review Focus

1. Hash rỗng (`#` hoặc không có hash) → vẫn vào dashboard, không hiện "Lạc đoàn" (`''` phải có trong `KNOWN_PAGES`).
2. Member gõ `#accounts` / `#reports` → vẫn chuyển về dashboard, không hiện màn hình chặn (tránh lộ trang tồn tại).
3. `#soon/khong-co` hoặc `#soon` → trang "Lạc đoàn", không vỡ.
4. Mở modal `task-edit` từ chi tiết công việc rồi đóng → quay lại đúng chi tiết công việc đó.
5. Bấm icon xoá checklist → không bật/tắt checkbox của mục đó.

---

### Task 1: Bộ dựng, bảng nội dung, router và menu "Sắp có"

**Files:**
- Modify: `core/public/app.js` (sau dòng `const avatar=…`; hàm `route()`)
- Modify: `core/public/index.html` (cuối `<nav id="nav">`)
- Modify: `core/public/components.css` (cuối file)
- Test: `core/tests/frontend.contract.test.js`

**Interfaces:**
- Produces: `SSO_READY` (boolean), `COMING_SOON` (object, key → `{icon, lost?, vi:{name,line}, en:{name,line}}`),
  `KNOWN_PAGES` (Set), `comingSoonView(key, options={modal:false}) → string`, `bindComingSoon(root)`,
  `showComingSoon(key)`, `comingSoonModal(key, onClose=null)`.

- [ ] **Step 1: Viết test đỏ** — thêm vào cuối `core/tests/frontend.contract.test.js`:

```js
function literalAfter(source, marker) {
  const start = source.indexOf(marker);
  assert.ok(start !== -1, `missing ${marker}`);
  const end = source.indexOf('\n', start);
  return new Function(`return ${source.slice(start + marker.length, end).replace(/;\s*$/, '')}`)();
}

test('coming-soon copy covers every unfinished entry point in both languages', () => {
  const table = literalAfter(assets['app.js'], 'const COMING_SOON=');
  assert.deepEqual(Object.keys(table).sort(), ['directive', 'not-found', 'ops-log', 'sso', 'submission', 'task-edit']);
  for (const [key, item] of Object.entries(table)) {
    assert.match(item.icon, /^[a-z-]+$/, `${key} needs a Phosphor icon name`);
    for (const language of ['vi', 'en']) {
      assert.ok(item[language]?.name && item[language]?.line, `${key} needs ${language} name and line`);
    }
  }
  assert.doesNotMatch(assets['app.js'], /sang Cam/i, 'the screen must not joke about trafficking victims');
  assert.match(assets['app.js'], /Chúng tôi đã chích điện dev để đẩy nhanh tiến độ\./);
  assert.match(assets['app.js'], /We've tased the devs to speed things up\./);
});

test('router shows coming-soon pages, a lost page for unknown hashes, and still hides forbidden pages', () => {
  const app = assets['app.js'];
  const route = app.slice(app.indexOf('async function route()'), app.indexOf('function nbEventRow'));
  const known = literalAfter(app, 'const KNOWN_PAGES=');
  for (const page of ['', 'dashboard', 'accounts', 'reports', 'activity', 'board', 'team', 'my-tasks-today']) {
    assert.ok(known.has(page), `${page || '(empty hash)'} must stay a known page`);
  }
  assert.ok(!known.has('soon'), 'soon pages are routed explicitly');
  assert.match(route, /page==='soon'&&id!=='not-found'&&COMING_SOON\[id\]\)showComingSoon\(id\)/);
  assert.match(route, /else if\(KNOWN_PAGES\.has\(page\)\)location\.hash='dashboard';else showComingSoon\('not-found'\)/);
  assert.match(route, /a\.dataset\.page===`\$\{page\}\/\$\{id\}`/, 'soon links must highlight individually');
});

test('the sidebar teases upcoming features in a labelled group', () => {
  const nav = assets['index.html'].slice(assets['index.html'].indexOf('<nav id="nav"'), assets['index.html'].indexOf('</nav>'));
  assert.match(nav, /<div class="nav-soon" role="group" aria-label="Sắp có">/);
  for (const key of ['directive', 'submission', 'ops-log']) {
    assert.match(nav, new RegExp(`<a href="#soon/${key}" data-page="soon/${key}"[^>]*>`), `missing ${key} link`);
  }
});

test('the coming-soon screen honours reduced motion and exposes an accessible meter', () => {
  const body = mediaBody(assets['components.css'], /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/g);
  assert.equal(computedRule(body, '.soon-mascot').animation?.value, 'none');
  assert.match(assets['app.js'], /class="soon-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100"/);
  assert.match(assets['app.js'], /const start=30\+Math\.floor\(Math\.random\(\)\*41\)/);
  assert.match(assets['app.js'], /Math\.min\(99,/);
});
```

- [ ] **Step 2: Chạy test, thấy đỏ**

Run: `cd core && node --test tests/frontend.contract.test.js`
Expected: 4 test mới FAIL (`missing const COMING_SOON=`, …).

- [ ] **Step 3: Thêm code vào `app.js`** — ngay sau dòng `const avatar=…`:

```js
const SSO_READY=false;
const COMING_SOON={sso:{icon:'microsoft-outlook-logo',vi:{name:'Đăng nhập Microsoft HUST',line:'Tài khoản HUST đang làm thủ tục nhập học — chưa được cấp thẻ. Tạm dùng tài khoản nội bộ nhé.'},en:{name:'Microsoft HUST sign-in',line:'Your HUST account is still enrolling. Use your local account for now.'}},directive:{icon:'paper-plane-tilt',vi:{name:'Giao việc',line:'Việc này đã được giao… cho đội dev.'},en:{name:'Directives',line:'This task has been assigned… to the dev team.'}},submission:{icon:'stamp',vi:{name:'Trình',line:'Đã trình lên — đang chờ ký duyệt.'},en:{name:'Submissions',line:'Submitted — awaiting sign-off.'}},'ops-log':{icon:'notebook',vi:{name:'Nhật ký trực ban',line:'Ca trực này chưa có ai nhận ca.'},en:{name:'Duty log',line:'Nobody has picked up this shift yet.'}},'task-edit':{icon:'pencil-simple',vi:{name:'Sửa công việc',line:'Tính năng sửa deadline… hiện chưa có deadline.'},en:{name:'Edit task',line:'The deadline-editing feature… has no deadline yet.'}},'not-found':{icon:'compass',lost:true,vi:{name:'Lạc đoàn',line:'Lạc đoàn rồi! Trang này không tồn tại — chích điện cũng không ra.'},en:{name:'Lost',line:'You wandered off from the group! This page does not exist — not even a taser can bring it back.'}}};
const SOON_ZAPS={vi:['Dev đã tỉnh.','Dev đang gõ nhanh hơn.','Dev xin nghỉ phép.','Công đoàn đã được thông báo.'],en:['The devs are awake.','The devs are typing faster.','The devs asked for a day off.','The union has been notified.']};
const KNOWN_PAGES=new Set(['','dashboard','calendar','activities','activity','board','my-tasks','my-tasks-today','teams','team','people','accounts','documents','reports','archive']);
const SOON_MASCOT=`<svg class="soon-mascot" viewBox="0 0 160 160" aria-hidden="true" focusable="false"><ellipse class="soon-fill soon-ink" cx="78" cy="128" rx="44" ry="26"/><path class="soon-neck-out" d="M92 112C84 84 108 72 102 44"/><path class="soon-neck-in" d="M92 112C84 84 108 72 102 44"/><circle class="soon-fill soon-ink" cx="102" cy="38" r="16"/><path class="soon-beak" d="M114 36l34 10-34 4z"/><circle class="soon-eye soon-ink" cx="104" cy="35" r="7"/><path class="soon-ink" d="M97 33h14"/><circle class="soon-pupil" cx="106" cy="37" r="2"/><rect class="soon-taser" x="36" y="88" width="16" height="30" rx="4"/><path class="soon-fill soon-ink" d="M34 120c10-14 30-16 46-8-8 14-28 20-46 8z"/><path class="soon-spark" d="M38 86l4-10 4 7 4-11 4 9"/></svg>`;
const soonCopy=key=>{const item=COMING_SOON[key]||COMING_SOON['not-found'];return {...item,...item[lang==='vi'?'vi':'en']}};
function comingSoonView(key,options={}){const c=soonCopy(key),vn=lang==='vi',start=30+Math.floor(Math.random()*41);const title=c.lost?c.line:(vn?'Tính năng này đang được phát triển.':'This feature is under development.');const sub=c.lost?'':(vn?'Chúng tôi đã chích điện dev để đẩy nhanh tiến độ.':"We've tased the devs to speed things up.");const meter=c.lost?'':`<div class="soon-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${start}" aria-label="${vn?'Mức sạc dev':'Dev charge level'}"><span class="soon-meter-label">${icon('lightning')} ${vn?'Đang sạc dev…':'Charging devs…'} <b data-soon-pct>${start}%</b></span><span class="soon-meter-track"><span class="soon-meter-fill" style="width:${start}%"></span></span></div><p class="soon-line">“${esc(c.line)}”</p><p class="soon-done hidden" aria-live="polite"></p>`;const zap=c.lost?'':`<button type="button" class="btn primary" data-soon-zap>${icon('lightning')} ${vn?'Chích thêm phát nữa':'Zap them again'}</button>`;const leave=options.modal?`<button type="button" class="btn" data-close>${vn?'Đóng':'Close'}</button>`:`<a class="btn" href="#dashboard">${icon('arrow-left')} ${vn?'Về Tổng quan':'Back to dashboard'}</a>`;return `<section class="soon${c.lost?' soon-lost':''}" data-soon-view="${esc(key)}">${SOON_MASCOT}<span class="eyebrow">${c.lost?(vn?'LẠC ĐOÀN':'LOST'):(vn?'ĐANG PHÁT TRIỂN':'UNDER DEVELOPMENT')} · ${esc(c.name)}</span><h1 class="soon-title">${esc(title)}</h1>${sub?`<p class="soon-sub">${esc(sub)} ${icon('lightning',{className:'soon-bolt'})}</p>`:''}${meter}<div class="soon-actions">${zap}${leave}</div></section>`}
function bindComingSoon(root){const view=$('[data-soon-view]',root),btn=view&&$('[data-soon-zap]',view);if(!btn)return;let zaps=0;btn.onclick=()=>{const meter=$('.soon-meter',view),pct=Math.min(99,Number(meter.getAttribute('aria-valuenow'))+5+Math.floor(Math.random()*8));meter.setAttribute('aria-valuenow',pct);$('.soon-meter-fill',view).style.width=`${pct}%`;$('[data-soon-pct]',view).textContent=`${pct}%`;view.classList.remove('zapped');void view.offsetWidth;view.classList.add('zapped');const lines=SOON_ZAPS[lang==='vi'?'vi':'en'];toast(lines[zaps++%lines.length]);if(pct>=99){btn.disabled=true;const done=$('.soon-done',view);done.textContent=lang==='vi'?'Dev đã ngất. Vui lòng quay lại sau.':'The devs have passed out. Please come back later.';done.classList.remove('hidden')}}}
function showComingSoon(key){$('#content').innerHTML=comingSoonView(key);bindComingSoon($('#content'))}
function comingSoonModal(key,onClose=null){openModal(comingSoonView(key,{modal:true}));bindComingSoon($('#modal-content'));if(onClose)$('#modal').addEventListener('close',onClose,{once:true})}
```

- [ ] **Step 4: Sửa `route()`** — trong vòng tô `active`, thêm
  `||a.dataset.page===\`${page}/${id}\`` sau `a.dataset.page===page`. Thay đuôi chuỗi else
  `else if(page==='archive')await archive();else location.hash='dashboard'` bằng:

```js
else if(page==='archive')await archive();else if(page==='soon'&&id!=='not-found'&&COMING_SOON[id])showComingSoon(id);else if(KNOWN_PAGES.has(page))location.hash='dashboard';else showComingSoon('not-found')
```

- [ ] **Step 5: Menu trong `index.html`** — ngay trước `</nav>`:

```html
        <div class="nav-soon" role="group" aria-label="Sắp có">
          <span class="nav-soon-label">Sắp có</span>
          <a href="#soon/directive" data-page="soon/directive" title="Giao việc (sắp có)"><i class="ph-bold ph-paper-plane-tilt" aria-hidden="true"></i><span>Giao việc</span><em class="soon-pill">Sắp có</em></a>
          <a href="#soon/submission" data-page="soon/submission" title="Trình (sắp có)"><i class="ph-bold ph-stamp" aria-hidden="true"></i><span>Trình</span><em class="soon-pill">Sắp có</em></a>
          <a href="#soon/ops-log" data-page="soon/ops-log" title="Nhật ký trực ban (sắp có)"><i class="ph-bold ph-notebook" aria-hidden="true"></i><span>Nhật ký trực ban</span><em class="soon-pill">Sắp có</em></a>
        </div>
```

- [ ] **Step 6: CSS cuối `components.css`**

```css
/* Coming soon — màn hình "Đang phát triển" (SPEC-SOON-001) */
.nav-soon { margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--line); }
.nav-soon-label { display: block; padding: 0 var(--space-3) var(--space-1); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.sidebar .nav-soon a { opacity: .78; }
.soon-pill { margin-left: auto; padding: 1px 8px; border-radius: var(--radius-pill); background: var(--surface-subtle); color: var(--muted); font-size: 10px; font-style: normal; font-weight: 700; }
.soon { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); max-width: 560px; margin: var(--space-8) auto; padding: var(--space-4); text-align: center; }
.soon-mascot { width: 148px; height: 148px; animation: soon-wobble 2.6s ease-in-out infinite; }
.soon-mascot .soon-ink { stroke: var(--ink); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.soon-mascot .soon-fill { fill: var(--surface-raised); }
.soon-mascot path.soon-ink:not(.soon-fill) { fill: none; }
.soon-mascot .soon-eye { fill: var(--surface-raised); }
.soon-mascot .soon-pupil { fill: var(--ink); }
.soon-mascot .soon-neck-out { fill: none; stroke: var(--ink); stroke-width: 18; stroke-linecap: round; }
.soon-mascot .soon-neck-in { fill: none; stroke: var(--surface-raised); stroke-width: 12; stroke-linecap: round; }
.soon-mascot .soon-beak { fill: var(--orange); }
.soon-mascot .soon-taser { fill: var(--ink); }
.soon-mascot .soon-spark { fill: none; stroke: var(--blue); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; animation: soon-spark 1.1s steps(2, end) infinite; }
.soon-title { margin: 0; font-family: var(--font-display); font-size: clamp(22px, 4vw, 30px); line-height: 1.25; color: var(--text-primary); }
.soon-sub { margin: 0; color: var(--text-secondary); }
.soon-bolt { color: var(--orange); }
.soon-meter { width: 100%; max-width: 360px; display: grid; gap: var(--space-1); }
.soon-meter-label { font-size: 13px; color: var(--text-secondary); }
.soon-meter-track { height: 10px; border-radius: var(--radius-pill); background: var(--surface-subtle); overflow: hidden; }
.soon-meter-fill { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--blue), var(--orange)); transition: width var(--duration-standard) ease-out; }
.soon-line { margin: 0; font-style: italic; color: var(--text-secondary); }
.soon-done { margin: 0; font-weight: 700; color: var(--status-danger); }
.soon-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--space-2); margin-top: var(--space-2); }
.soon.zapped .soon-mascot { animation: soon-jolt .35s linear 1; }
.checklist-remove { margin-left: auto; padding: 2px 6px; border: 0; background: none; color: var(--muted); cursor: pointer; }
.checklist-remove:hover { color: var(--status-danger); }
@keyframes soon-wobble { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
@keyframes soon-spark { 0% { opacity: 1; } 100% { opacity: .2; } }
@keyframes soon-jolt { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px) rotate(-3deg); } 75% { transform: translateX(4px) rotate(3deg); } }
@media (prefers-reduced-motion: reduce) {
  .soon-mascot, .soon-mascot .soon-spark, .soon.zapped .soon-mascot { animation: none; }
  .soon-meter-fill { transition: none; }
}
```

- [ ] **Step 7: Chạy test, thấy xanh**

Run: `cd core && node --test tests/frontend.contract.test.js`
Expected: toàn bộ PASS.

- [ ] **Step 8: Commit** `feat(core-ui): coming-soon screen, upcoming-features nav and lost page`

### Task 2: Điểm vào modal — SSO và Sửa công việc

**Files:**
- Modify: `core/public/app.js` (gần `$('#logout')…`; `taskDetailModal`)
- Test: `core/tests/frontend.contract.test.js`

**Interfaces:**
- Consumes: `SSO_READY`, `comingSoonModal(key, onClose)` từ Task 1; `taskDetailModal(taskId)` có sẵn.
- Produces: thuộc tính HTML `data-soon="<key>"` (+ `data-soon-task="<taskId>"` để quay lại).

- [ ] **Step 1: Viết test đỏ**

```js
test('unfinished actions open the coming-soon modal instead of failing', () => {
  const app = assets['app.js'];
  assert.match(app, /if\(!SSO_READY\)\$\('#login \.btn\.microsoft'\)\?\.setAttribute\('data-soon','sso'\)/);
  assert.match(app, /const trigger=e\.target\.closest\('\[data-soon\]'\);if\(!trigger\)return;e\.preventDefault\(\);/);
  assert.match(app, /comingSoonModal\(trigger\.dataset\.soon,back\?\(\)=>taskDetailModal\(back\):null\)/);
  const detail = app.slice(app.indexOf('async function taskDetailModal('));
  assert.match(detail, /\$\{manages\?`<button type="button" class="btn small" data-soon="task-edit" data-soon-task="\$\{tk\.id\}">/);
  assert.match(detail, /class="checklist-remove" data-soon="task-edit" data-soon-task="\$\{tk\.id\}" aria-label="Xoá mục này"/);
});
```

- [ ] **Step 2: Chạy test, thấy đỏ** — `cd core && node --test tests/frontend.contract.test.js` → test mới FAIL.

- [ ] **Step 3: Trình nghe uỷ quyền + SSO** — thêm ngay trước dòng `$('#logout')?.addEventListener(…)`:

```js
if(!SSO_READY)$('#login .btn.microsoft')?.setAttribute('data-soon','sso');
document.addEventListener('click',e=>{const trigger=e.target.closest('[data-soon]');if(!trigger)return;e.preventDefault();e.stopPropagation();const back=trigger.dataset.soonTask;comingSoonModal(trigger.dataset.soon,back?()=>taskDetailModal(back):null)});
```

- [ ] **Step 4: Nút trong `taskDetailModal`**
  - Sau `${badge(tk.status)}` trong `.task-detail-title`, thêm:
    `${manages?\`<button type="button" class="btn small" data-soon="task-edit" data-soon-task="${tk.id}">${icon('pencil-simple')} Sửa</button>\`:''}`
  - Trong mỗi `<label class="checklist-item">`, sau `<span>${esc(item.title)}</span>`, thêm:
    `${manages?\`<button type="button" class="checklist-remove" data-soon="task-edit" data-soon-task="${tk.id}" aria-label="Xoá mục này">${icon('trash')}</button>\`:''}`

- [ ] **Step 5: Chạy test, thấy xanh** — `cd core && node --test tests/frontend.contract.test.js` → PASS.

- [ ] **Step 6: Commit** `feat(core-ui): route SSO and task edit to the coming-soon modal`

### Task 3: Cache-bust, tài liệu, kiểm tra cuối

**Files:**
- Modify: `core/public/index.html` (`?v=2.9.0` → `?v=2.10.0`, 4 chỗ)
- Modify: `docs/dev/frontend.md` (mục Core + lịch sử, version 1.7)
- Modify: `docs/specs/2026-10-03-core-coming-soon-design.md` (status `active`)

- [ ] **Step 1:** Đổi 4 query `?v=2.9.0` thành `?v=2.10.0` để trình duyệt tải lại asset.
- [ ] **Step 2:** Thêm đoạn vào `docs/dev/frontend.md` mục Core: màn hình "Đang phát triển" (`COMING_SOON`), cách thêm
  một mục (thêm key vào bảng + link `#soon/<key>` hoặc nút `data-soon="<key>"`), cách gỡ khi tính năng xong (xoá key,
  link/nút; SSO: đặt `SSO_READY=true`). Bump version 1.7, `updated: 2026-10-03`, thêm dòng lịch sử.
- [ ] **Step 3:** Kiểm tra trên trình duyệt (chạy Core local nếu có DB; không thì mở `index.html` không đủ, bỏ qua và ghi rõ).
- [ ] **Step 4:** `npm run docs:index && npm run docs:check -- --base origin/staging && npm run test:tools` — xanh.
- [ ] **Step 5:** Commit `docs: coming-soon screen in frontend guide`, push, mở PR vào `staging`.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-03 | Bản đầu | DYC |
| 1.1 | 2026-10-08 | Ghi nhận hotfix PR #81: trang chi tiết hoạt động tra khung Participants bằng `#participants-head` thay vì qua nút `#volunteer` (nút ẩn khi người xem đã tham gia → lỗi `null.closest`, trang trắng); asset `?v=2.10.1`; phạm vi không đổi | DYC |
