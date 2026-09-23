from app.db import SessionLocal
from app.seeds.admin_seed import seed_admin
from app.seeds.catalog_seed import seed_catalog
from app.seeds.workflow_seed import seed_workflow

with SessionLocal() as db:
    seed_workflow(db)
    seed_catalog(db)
    admin = seed_admin(db)
    print(f"Đã seed quy trình, danh mục giấy tờ và tài khoản quản trị ({admin.email}).")
