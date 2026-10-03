from pathlib import Path
import pytest
from noti.templating import load_registry, render, sanitize_header, TemplateError

ROOT = Path(__file__).parent.parent / "templates"


def test_subject_strips_crlf_and_html_is_escaped():
    reg = load_registry(ROOT)
    data = {**reg.get("task.assigned").data_example, "task": {"id": 1, "title": 'x"<script>\r\nBcc: a@b', "path": "/#a/1"}}
    out = render(reg, "task.assigned", data, "An\r\nBcc: z@z", "https://app.example")
    assert "\r" not in out.subject and "\n" not in out.subject
    assert "<script>" not in out.html and "&lt;script&gt;" in out.html


def test_prune_drops_undeclared_variables():
    reg = load_registry(ROOT)
    t = reg.get("task.assigned")
    pruned = t.prune({**t.data_example, "secret": "x"})
    assert "secret" not in pruned


def test_missing_required_paths_reported():
    reg = load_registry(ROOT)
    assert "task.title" in reg.get("task.assigned").missing({"actor": "B", "task": {"id": 1}})


def test_broken_template_dir_fails_loading(tmp_path):
    (tmp_path / "bad").mkdir()
    (tmp_path / "bad" / "meta.yaml").write_text("key: bad\n")
    with pytest.raises(TemplateError):
        load_registry(tmp_path)


def test_sanitize_header():
    assert sanitize_header("a\r\nb") == "a b"
