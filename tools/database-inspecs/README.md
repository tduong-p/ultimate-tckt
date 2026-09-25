# Database Schema Inspection Tools

Công cụ để trích xuất và phân tích cấu trúc database từ Docker containers.

## 📋 Tổng quan

Thư mục này chứa các bash scripts để export đầy đủ schema của database (MySQL và PostgreSQL) từ Docker containers ra file CSV. Hữu ích cho:

- 📊 **Tài liệu hóa** cấu trúc database hiện tại
- 🔍 **So sánh** schema giữa các môi trường (dev, staging, production)
- 🚀 **Lập kế hoạch migration** và đánh giá tác động
- 📝 **Audit** và review cấu trúc dữ liệu
- 🔄 **Backup** metadata của database

## 🛠️ Scripts có sẵn

### 1. `inspect_mysql_schema.sh`

Trích xuất schema từ MySQL/MariaDB database chạy trong Docker container.

**Cấu trúc output:**
- `table_name` - Tên bảng
- `ordinal_position` - Vị trí cột trong bảng
- `column_name` - Tên cột
- `column_type` - Kiểu dữ liệu (VD: `varchar(255)`, `int unsigned`)
- `is_nullable` - `YES` hoặc `NO`
- `column_key` - `PRI` (primary), `UNI` (unique), `MUL` (index), hoặc trống
- `column_default` - Giá trị mặc định
- `extra` - Thông tin bổ sung (VD: `auto_increment`, `on update`)
- `column_comment` - Comment của cột

### 2. `inspect_postgres_schema.sh`

Trích xuất schema từ PostgreSQL database chạy trong Docker container.

**Cấu trúc output:**
- `table_name` - Tên bảng
- `ordinal_position` - Vị trí cột trong bảng
- `column_name` - Tên cột
- `data_type` - Kiểu dữ liệu với length (VD: `character varying(255)`)
- `is_nullable` - `YES` hoặc `NO`
- `key_type` - `PK` nếu là primary key, trống nếu không
- `column_default` - Giá trị mặc định
- `column_comment` - Comment của cột

## 🚀 Cách sử dụng

### Yêu cầu

- **Docker** đang chạy
- **Bash shell** (Linux, macOS, Git Bash trên Windows, WSL)
- Quyền truy cập vào Docker containers
- Credentials để kết nối database

### Cú pháp

```bash
# MySQL
./inspect_mysql_schema.sh <container_name> <db_user> <db_name> [output_file]

# PostgreSQL
./inspect_postgres_schema.sh <container_name> <db_user> <db_name> [output_file]
```

### Ví dụ

#### MySQL

```bash
# Sử dụng với container production
./inspect_mysql_schema.sh ultimate-tckt-production-core-db-1 tckt_app ultimate_tckt schema_prod.csv

# Nếu không chỉ định output file, sẽ tự tạo với timestamp
./inspect_mysql_schema.sh my-mysql-container root my_database
# Output: schema_dump_20240115_143052.csv
```

#### PostgreSQL

```bash
# Sử dụng với container production
./inspect_postgres_schema.sh ultimate-tckt-production-ctd-db-1 postgres ctd_db schema_prod.csv

# Với container local
./inspect_postgres_schema.sh local-postgres-db postgres dev_db schema_local.csv
```

### Workflow thực tế

```bash
# 1. Xem danh sách containers đang chạy
docker ps

# 2. Tìm container chứa database
docker ps | grep mysql
docker ps | grep postgres

# 3. Chạy script
cd tools/database-inspecs
./inspect_mysql_schema.sh <container_name> <user> <db_name> output.csv

# 4. Script sẽ hỏi password
# MySQL password for 'tckt_app': ********

# 5. Kiểm tra output
cat output.csv | head -20
# hoặc mở bằng Excel, Google Sheets, etc.
```

## 📊 Phân tích output

### So sánh schemas

```bash
# Export schema từ 2 môi trường
./inspect_mysql_schema.sh prod-db-1 user prod_db prod_schema.csv
./inspect_mysql_schema.sh dev-db-1 user dev_db dev_schema.csv

# So sánh bằng diff
diff prod_schema.csv dev_schema.csv

# Hoặc sử dụng tool chuyên dụng
# - Beyond Compare
# - WinMerge
# - Excel compare
```

### Import vào Excel/Google Sheets

File CSV output có thể mở trực tiếp trong:
- Microsoft Excel
- Google Sheets
- LibreOffice Calc
- Any CSV viewer

Sau đó có thể:
- Filter theo bảng
- Tìm kiếm column cụ thể
- Phân tích kiểu dữ liệu
- Tạo báo cáo

## 🔒 Bảo mật

### Password handling

Scripts sử dụng **interactive password prompt** (`read -s`) để:
- ✅ Không lưu password trong command history
- ✅ Không hiển thị password trên terminal
- ✅ Không lưu password trong script

### Best practices

```bash
# ✅ ĐÚNG: Password được nhập tương tác
./inspect_mysql_schema.sh my-container user db output.csv
# Script sẽ hỏi password

# ❌ SAI: Không bao giờ hardcode password
./some_script.sh user:password@host
```

### Output files

⚠️ **Lưu ý:** File CSV output chứa thông tin nhạy cảm về cấu trúc database:
- **KHÔNG** commit vào git
- **KHÔNG** share công khai
- Lưu ở nơi an toàn (encrypted storage)
- Xóa sau khi sử dụng xong

## 🐛 Xử lý lỗi

### Container không tồn tại

```bash
Error: No such container: my-container
```

**Giải pháp:** Kiểm tra tên container bằng `docker ps`

### Authentication failed

```bash
ERROR 1045 (28000): Access denied for user 'user'@'localhost'
```

**Giải pháp:** 
- Kiểm tra username
- Nhập đúng password
- Đảm bảo user có quyền truy cập database

### Docker không chạy

```bash
Cannot connect to the Docker daemon
```

**Giải pháp:** Khởi động Docker service

### Permission denied

```bash
bash: ./inspect_mysql_schema.sh: Permission denied
```

**Giải pháp:** Cấp quyền execute
```bash
chmod +x inspect_mysql_schema.sh
chmod +x inspect_postgres_schema.sh
```

## 📝 Use cases thực tế

### 1. Lập kế hoạch migration

```bash
# Export schema hiện tại
./inspect_mysql_schema.sh prod-db user ultimate_tckt current_schema.csv

# Phân tích:
# - Các bảng cần thêm (orgUnits, directives, ...)
# - Các cột cần thêm (teams.unitId, activities.directiveId, ...)
# - Foreign keys cần tạo
```

### 2. Documentation

```bash
# Export schema để tạo tài liệu
./inspect_mysql_schema.sh db user dbname docs/database_schema_v2.2.csv

# Commit vào repo (nếu không nhạy cảm)
git add docs/database_schema_v2.2.csv
git commit -m "docs: update database schema documentation"
```

### 3. Code review

```bash
# Trước khi merge PR, export schema
./inspect_mysql_schema.sh test-db user test_db before_merge.csv

# Sau khi merge và run migration
./inspect_mysql_schema.sh test-db user test_db after_merge.csv

# So sánh
diff before_merge.csv after_merge.csv
```

### 4. Troubleshooting

```bash
# Khi gặp lỗi column not found, kiểm tra schema
./inspect_mysql_schema.sh prod-db user db check_columns.csv

# Tìm kiếm column
grep "email" check_columns.csv
grep "users" check_columns.csv
```

## 🔄 Integration với CI/CD

Có thể tích hợp scripts vào pipeline:

```yaml
# .github/workflows/schema-check.yml
name: Schema Check
on: [pull_request]

jobs:
  schema-diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Export schema from staging
        run: |
          cd tools/database-inspecs
          echo "$DB_PASSWORD" | ./inspect_mysql_schema.sh \
            staging-db $DB_USER $DB_NAME staging_schema.csv
      
      - name: Compare with baseline
        run: diff baseline_schema.csv staging_schema.csv
```

## 🤝 Contributing

Khi cần thêm tính năng:

1. **Export indexes và constraints riêng**
   - Hiện tại chỉ export basic info
   - Có thể mở rộng để export foreign keys, indexes chi tiết

2. **Support thêm databases**
   - MongoDB schema inspector
   - SQL Server schema inspector

3. **Export formats khác**
   - JSON format
   - Markdown tables
   - HTML report

## 📚 Tham khảo

- [MySQL Information Schema](https://dev.mysql.com/doc/refman/8.0/en/information-schema.html)
- [PostgreSQL System Catalogs](https://www.postgresql.org/docs/current/catalogs.html)
- [Docker exec documentation](https://docs.docker.com/engine/reference/commandline/exec/)

## 📄 License

Internal tool for TCKT Activity Hub project.

---

**Last updated:** January 2026  
**Maintained by:** TCKT Development Team
