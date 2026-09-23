# Lịch sử bộ tài liệu

Mỗi lần tài liệu thay đổi trên `main`, CI (`.github/workflows/docs.yml`) gắn tag `docs-vYYYY.MM.N`
và tạo một GitHub Release cùng tên. Release đó liệt kê tài liệu đã đổi kèm version mới, và đính kèm bản Word/PDF.

- Xem danh sách: tab **Releases** của repo, hoặc chạy `gh release list`.
- Lịch sử chi tiết của từng tài liệu nằm ở mục `## Lịch sử phiên bản` cuối mỗi file.
- Lấy lại bộ tài liệu ở một phiên bản: `git checkout docs-vYYYY.MM.N -- docs/`.
