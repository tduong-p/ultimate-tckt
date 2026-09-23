# Structure

```
app.js                  # entry
db.sql                  # schema gốc
src/
  config/               # database, env, migrate, session, settings-crypto
  middleware/           # auth, errors, uploads (thêm loadUnitContext ở GĐ1)
  policies/access.js    # phân quyền, activityScope. GĐ1 thêm scopeFor ở đây
  routes/               # mỗi file tạo một router: activities, tasks, users, teams, reports, settings-*
  services/             # email rule engine, cron runner, notifications…
public/                 # frontend cũ (JS thuần), chỉ bảo trì
web/                    # frontend chung mới (GĐ1)
  src/shell/  src/ui/  src/lib/  src/modules/<module-id>/
tests/                  # node --test, helpers/ chứa fixtures
docs/superpowers/specs/ # snapshot thiết kế lúc brainstorm, không sửa
.kiro/specs/            # spec đang dùng (requirements, design, tasks)
```

## Quy ước
- Route mới dùng pattern `createXRoutes(context)` rồi đăng ký trong `src/routes/index.js`.
- Mọi truy vấn đọc dữ liệu nghiệp vụ phải đi qua `scopeFor`, không tự viết điều kiện quyền trong route.
- Code của module nằm trong thư mục module của nó. Ở `web/`, mỗi nhóm chỉ sửa `src/modules/<module>/` của mình. Muốn sửa `shell/` hoặc `ui/` thì phải qua review của nhóm Core.
- Commit message theo Conventional Commits (`feat(scope): …`), viết tiếng Anh, giải thích lý do.
