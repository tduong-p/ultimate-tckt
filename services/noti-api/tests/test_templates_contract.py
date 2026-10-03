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
}


def test_registry_has_all_11_templates():
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
