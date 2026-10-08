"""Mọi email của cùng một công việc (hoặc cùng một hoạt động) phải có subject giống hệt nhau
để Gmail/Outlook gom thành một thread. Xem docs/dev/noti.md, mục Subject và thread."""
import copy
from pathlib import Path

import pytest

from noti.templating import load_registry, render

ROOT = Path(__file__).parent.parent / "templates"
REG = load_registry(ROOT)

TASK_KEYS = sorted(k for k in REG.templates if k.startswith("task."))
ACTIVITY_KEYS = sorted(k for k in REG.templates if k.startswith("activity."))


def _with_titles(key, task=True):
    data = copy.deepcopy(REG.templates[key].data_example)
    data.setdefault("activity", {})["title"] = "Mùa hè xanh 2026"
    if task:
        data.setdefault("task", {})["title"] = "Làm poster"
    else:
        data.pop("task", None)
    return data


@pytest.mark.parametrize("key", TASK_KEYS)
def test_task_subject_is_project_plus_task(key):
    out = render(REG, key, _with_titles(key), "A", "https://app.example")
    assert out.subject == "[Mùa hè xanh 2026] Làm poster"


@pytest.mark.parametrize("key", TASK_KEYS)
def test_task_templates_require_activity_title(key):
    assert "activity.title" in REG.templates[key].required


@pytest.mark.parametrize("key", ACTIVITY_KEYS)
def test_activity_subject_is_project_only(key):
    out = render(REG, key, _with_titles(key, task=False), "A", "https://app.example")
    assert out.subject == "[Mùa hè xanh 2026]"


def test_mention_on_task_threads_with_task_emails():
    out = render(REG, "comment.mentioned", _with_titles("comment.mentioned"), "A", "https://app.example")
    assert out.subject == "[Mùa hè xanh 2026] Làm poster"


def test_mention_on_activity_threads_with_activity_emails():
    data = _with_titles("comment.mentioned", task=False)
    out = render(REG, "comment.mentioned", data, "A", "https://app.example")
    assert out.subject == "[Mùa hè xanh 2026]"
    assert "Làm poster" not in out.text


def test_mention_body_shows_actor_and_comment():
    data = _with_titles("comment.mentioned")
    data["actor"] = "Trần Văn C"
    data["comment"]["body"] = "Nhờ @bạn xem giúp <b>poster</b>"
    out = render(REG, "comment.mentioned", data, "A", "https://app.example")
    assert "Trần Văn C" in out.text and "Nhờ @bạn xem giúp <b>poster</b>" in out.text
    assert "&lt;b&gt;poster&lt;/b&gt;" in out.html
