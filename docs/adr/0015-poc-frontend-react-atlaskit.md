---
doc_id: ADR-0015-001
title: Cho phép xây dựng POC frontend React + Atlaskit
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-05
related_code: []
---

# Cho phép xây dựng POC frontend React + Atlaskit

Ghi lại quyết định xây dựng bản thử nghiệm (Proof of Concept - POC) để đánh giá việc chuyển đổi frontend sang React và Atlassian Design System.

## Bối cảnh

- Hệ thống frontend hiện tại sử dụng Vanilla JS và Minimalist UI (`ADR-0001-001` và `ADR-0003-001`). Mặc dù nhẹ và nhanh, nhưng việc mở rộng, bảo trì các form phức tạp ngày càng khó khăn.
- Có đề xuất đập đi và xây lại toàn bộ frontend sang phong cách mới sử dụng thư viện `@atlaskit/css-reset` (Atlassian Design System).
- Tuy nhiên, việc chuyển đổi ngay lập tức mang rủi ro lớn về tiến độ (đặc biệt đối với giai đoạn 1) và có thể gây đứt gãy hệ thống. 
- Do đó, cần có một bản POC nghiệm thu nghiệm trước về thời gian tải, độ ổn định và trải nghiệm lập trình (DX).

## Quyết định

1. **Cho phép xây dựng một bản POC (Proof of Concept)** độc lập sử dụng React và `@atlaskit` để đánh giá tính khả thi.
2. **Vị trí:** Mã nguồn của POC sẽ được đặt tại một thư mục riêng biệt ở gốc repo (ví dụ: `web-poc/` hoặc thư mục theo thoả thuận) và **chỉ phục vụ mục đích thử nghiệm ở môi trường local**, không đưa vào quy trình build CI/CD production hiện tại.
3. **Phạm vi thử nghiệm:** Chỉ làm thử nghiệm nghiệm một màn hình tiêu biểu (như "My Tasks") kết nối với API hiện có.
4. Quyết định thay thế toàn bộ kiến trúc (supersede `ADR-0001` và `ADR-0003`) sẽ chỉ được đưa ra **sau khi POC được review và nghiệm thu thành công** bởi team.

## Hệ quả

- Core API và các module hiện hữu sẽ không bị ảnh hưởng, luồng công việc trên production và staging hiện tại được bảo toàn.
- Cần thời gian và nhân sự (hoặc AI agent) để thiết lập môi trường React/Vite/Webpack mới trong thư mục thử nghiệm này và tiến hành code bản mẫu.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-10-05 | Bản đầu, quyết định cho phép làm POC React + Atlaskit | DYC |
