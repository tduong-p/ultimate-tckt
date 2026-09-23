import sys

from app.db import SessionLocal
from app.jobs import run_reminders, send_outbox
from app.services import notifications

JOBS = {"send_outbox": send_outbox.run, "run_reminders": run_reminders.run}


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] not in JOBS:
        print(f"Dùng: python -m app.jobs [{' | '.join(JOBS)}]")
        raise SystemExit(1)
    notifications.register()
    with SessionLocal() as db:
        ket_qua = JOBS[sys.argv[1]](db)
    print(f"{sys.argv[1]}: {ket_qua}")


if __name__ == "__main__":
    main()
