from datetime import datetime, timezone, timedelta
from app.db import SessionLocal
from app.models.identity import Unit, UnitKind, User, Role
from app.models.case import Case, CaseType, Batch, CaseDetail
from app.models.document import Document, DocStatus, DocumentType
from app.models.workflow import CaseEvent
from app.seeds.workflow_seed import seed_workflow
from app.seeds.catalog_seed import seed_catalog
from app.seeds.admin_seed import seed_admin

def seed_demo():
    with SessionLocal() as db:
        seed_workflow(db)
        seed_catalog(db)
        seed_admin(db)

        # 1. Units
        units = {}
        for name, kind, email in [
            ("LCĐ Khoa CNTT", UnitKind.LIEN_CHI_DOAN, "cntt@sis.hust.edu.vn"),
            ("LCĐ Khoa Điện", UnitKind.LIEN_CHI_DOAN, "dien@sis.hust.edu.vn"),
            ("LCĐ Khoa Cơ khí", UnitKind.LIEN_CHI_DOAN, "cokhi@sis.hust.edu.vn"),
            ("LCĐ Khoa Hoá", UnitKind.LIEN_CHI_DOAN, "hoa@sis.hust.edu.vn"),
            ("Ban TCKT", UnitKind.TCKT, "tckt@sis.hust.edu.vn"),
            ("VP Đoàn", UnitKind.VP_DOAN, "vpdoan@sis.hust.edu.vn"),
        ]:
            u = db.query(Unit).filter_by(name=name).first()
            if not u:
                u = Unit(name=name, kind=kind, email=email)
                db.add(u)
                db.flush()
            units[name] = u

        # 2. Batch
        batch = db.query(Batch).filter_by(code="2026-2").first()
        if not batch:
            batch = Batch(code="2026-2", name="Đợt xét phát triển Đảng đợt 2/2026", is_open=True)
            db.add(batch)
            db.flush()

        # 3. Users
        users_data = [
            ("cb@hust.edu.vn", "Trần Văn Hùng", Role.CAN_BO_DON_VI, units["LCĐ Khoa CNTT"].id, "CB01"),
            ("sv@hust.edu.vn", "Nguyễn Minh Anh", Role.SINH_VIEN, units["LCĐ Khoa CNTT"].id, "20215412"),
            ("sv2@hust.edu.vn", "Trần Quốc Bảo", Role.SINH_VIEN, units["LCĐ Khoa CNTT"].id, "20218890"),
            ("sv3@hust.edu.vn", "Lê Thu Hà", Role.SINH_VIEN, units["LCĐ Khoa Điện"].id, "20204471"),
            ("sv4@hust.edu.vn", "Phạm Đức Duy", Role.SINH_VIEN, units["LCĐ Khoa Cơ khí"].id, "20219034"),
            ("sv5@hust.edu.vn", "Vũ Khánh Linh", Role.SINH_VIEN, units["LCĐ Khoa CNTT"].id, "20211123"),
            ("tckt@hust.edu.vn", "Lê Thị Mai", Role.TCKT, units["Ban TCKT"].id, "TCKT01"),
            ("vp@hust.edu.vn", "Phạm Hoàng Long", Role.VP_DOAN, units["VP Đoàn"].id, "VP01"),
        ]

        users = {}
        for email, full_name, role, unit_id, student_id in users_data:
            u = db.query(User).filter_by(email=email).first()
            if not u:
                u = User(email=email, full_name=full_name, role=role, unit_id=unit_id, student_id=student_id)
                db.add(u)
                db.flush()
            users[email] = u

        # 4. Cases & Documents
        doc_types = db.query(DocumentType).all()
        cases_to_seed = [
            (users["sv@hust.edu.vn"], units["LCĐ Khoa CNTT"], "KN-2026-0001", CaseType.KET_NAP, "dt_checking", 9),
            (users["sv2@hust.edu.vn"], units["LCĐ Khoa CNTT"], "KN-2026-0002", CaseType.KET_NAP, "dt_checking", 2),
            (users["sv3@hust.edu.vn"], units["LCĐ Khoa Điện"], "CCT-2026-0003", CaseType.CHUYEN_CHINH_THUC, "tckt_checking", 3),
            (users["sv4@hust.edu.vn"], units["LCĐ Khoa Cơ khí"], "KN-2026-0004", CaseType.KET_NAP, "eligible", 4),
            (users["sv5@hust.edu.vn"], units["LCĐ Khoa CNTT"], "KN-2026-0005", CaseType.KET_NAP, "need_supplement", 12),
        ]

        for applicant, unit, code, c_type, status, days_ago in cases_to_seed:
            existing = db.query(Case).filter_by(code=code).first()
            if not existing:
                entered_at = datetime.now(timezone.utc) - timedelta(days=days_ago)
                c = Case(
                    code=code,
                    applicant_id=applicant.id,
                    unit_id=unit.id,
                    batch_id=batch.id,
                    case_type=c_type,
                    status=status,
                    state_entered_at=entered_at,
                    created_at=entered_at,
                )
                db.add(c)
                db.flush()
                db.add(CaseDetail(
                    case_id=c.id,
                    phone="0987654321",
                    personal_email=applicant.email,
                    citizen_id="001202012345",
                    permanent_address="Hà Nội",
                    gpa=3.65,
                    conduct_score=92,
                ))
                
                # Documents for case
                for idx, dt in enumerate(doc_types):
                    doc_st = DocStatus.ACCEPTED if idx < 5 else (DocStatus.REJECTED if idx == 5 and status == "need_supplement" else DocStatus.SUBMITTED)
                    reason = "Bản scan bị mờ, vui lòng chụp lại rõ nét cả 4 góc" if doc_st == DocStatus.REJECTED else ""
                    filename = f"{applicant.student_id}_{dt.code}.pdf"
                    db.add(Document(
                        case_id=c.id,
                        document_type_id=dt.id,
                        name=dt.name,
                        status=doc_st,
                        filename=filename,
                        storage_key=f"cases/{c.id}/{filename}",
                        reason=reason,
                        updated_at=datetime.now(timezone.utc) - timedelta(days=days_ago),
                    ))

                # Event
                db.add(CaseEvent(
                    case_id=c.id,
                    actor_id=applicant.id,
                    action_code="submit",
                    from_status="draft",
                    to_status="dt_checking",
                    created_at=datetime.now(timezone.utc) - timedelta(days=days_ago),
                ))
                if status == "need_supplement":
                    db.add(CaseEvent(
                        case_id=c.id,
                        actor_id=users["cb@hust.edu.vn"].id,
                        action_code="request_supplement",
                        from_status="dt_checking",
                        to_status="need_supplement",
                        reason="Bản scan bị mờ, vui lòng chụp lại rõ nét cả 4 góc",
                        created_at=datetime.now(timezone.utc) - timedelta(days=2),
                    ))

        db.commit()
        print("Đã seed dữ liệu demo thành công!")

if __name__ == "__main__":
    seed_demo()
