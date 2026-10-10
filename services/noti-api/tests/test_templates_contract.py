from pathlib import Path
from noti.templating import load_registry, render

ROOT = Path(__file__).parent.parent / "templates"

EXPECTED_TEMPLATES = {
    "activity.proposed",
    "activity.participant_added",
    "activity.decided",
    "task.assigned",
    "task.response",
    "task.review_requested",
    "task.reviewed",
    "task.deadline_soon",
    "task.overdue",
    "task.unacknowledged",
    "system.test",
    "comment.mentioned",
    "task.updated",
    "activity.updated",
}


def test_registry_has_all_14_templates():
    reg = load_registry(ROOT)
    assert set(reg.templates.keys()) == EXPECTED_TEMPLATES


def test_templates_contract():
    reg = load_registry(ROOT)
    for key, template in reg.items():
        # missing(data_example) must be empty
        missing = template.missing(template.data_example)
        assert missing == [], f"Template {key} missing required fields in data_example: {missing}"

        # render must succeed
        out = render(reg, key, template.data_example, "Nguyễn Văn Test", "https://app.example")
        assert "\r" not in out.subject and "\n" not in out.subject, f"Template {key} subject has CRLF"
        assert "style=\"" in out.html, f"Template {key} html should have inlined styles"
        assert out.text, f"Template {key} text should not be empty"


def test_deadline_soon_has_no_trong_vong_and_example_window_is_calendar_label():
    # Core nhắc theo ngày lịch (tasks.deadline là DATE), nên "window" là nhãn như "1 ngày", không phải khoảng giờ.
    folder = ROOT / "task.deadline_soon"
    for name in ("body.txt.j2", "body.html.j2"):
        assert "trong vòng" not in (folder / name).read_text(encoding="utf-8"), name
    reg = load_registry(ROOT)
    assert reg.templates["task.deadline_soon"].data_example["window"] == "1 ngày"
