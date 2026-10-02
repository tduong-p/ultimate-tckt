import hashlib
import re
from dataclasses import dataclass, field
from pathlib import Path

import css_inline
import yaml
from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape


class TemplateError(Exception):
    pass


def sanitize_header(value: str) -> str:
    return re.sub(r"[\r\n]+", " ", str(value)).strip()


def _get(data, path):
    cur = data
    for part in path.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    return cur


def _put(out, path, value):
    cur = out
    parts = path.split(".")
    for part in parts[:-1]:
        cur = cur.setdefault(part, {})
    cur[parts[-1]] = value


@dataclass
class Template:
    key: str
    subject: str
    required: list[str]
    optional: list[str] = field(default_factory=list)
    ttl: int | None = None  # giây
    sensitive: bool = False
    data_example: dict = field(default_factory=dict)

    def missing(self, data: dict) -> list[str]:
        return [p for p in self.required if _get(data, p) in (None, "")]

    def prune(self, data: dict) -> dict:
        out: dict = {}
        for path in [*self.required, *self.optional]:
            value = _get(data, path)
            if value is not None:
                _put(out, path, value)
        return out


@dataclass
class Registry:
    templates: dict[str, Template]
    version: str
    env_html: Environment
    env_text: Environment

    def get(self, key: str) -> Template | None:
        return self.templates.get(key)

    def items(self):
        return self.templates.items()

    def render(self, key: str, data: dict, recipient_name: str | None = None, base_url: str = "https://app.example") -> "Rendered":
        return render(self, key, data, recipient_name, base_url)


@dataclass
class Rendered:
    subject: str
    html: str
    text: str


def load_registry(root: Path) -> Registry:
    root = Path(root)
    digest = hashlib.sha256()
    templates: dict[str, Template] = {}
    if not root.exists():
        raise TemplateError(f"Thư mục templates không tồn tại: {root}")
    for directory in sorted(p for p in root.iterdir() if p.is_dir() and not p.name.startswith("_")):
        try:
            meta_path = directory / "meta.yaml"
            if not meta_path.exists():
                raise TemplateError(f"{directory.name}: thiếu meta.yaml")
            meta = yaml.safe_load(meta_path.read_text(encoding="utf-8"))
            if not isinstance(meta, dict):
                raise TemplateError(f"{directory.name}: meta.yaml không phải dict")
            for needed in ("body.html.j2", "body.txt.j2"):
                if not (directory / needed).exists():
                    raise TemplateError(f"{directory.name}: thiếu {needed}")
            if meta.get("key") != directory.name:
                raise TemplateError(f"{directory.name}: key không khớp tên thư mục")
            templates[meta["key"]] = Template(
                key=meta["key"],
                subject=meta["subject"],
                required=list(meta.get("required", [])),
                optional=list(meta.get("optional", [])),
                ttl=meta.get("ttl"),
                sensitive=bool(meta.get("sensitive", False)),
                data_example=meta.get("data_example", {}),
            )
        except (OSError, KeyError, yaml.YAMLError) as error:
            raise TemplateError(f"{directory.name}: {error}") from error

    for file in sorted(root.rglob("*")):
        if file.is_file():
            digest.update(file.relative_to(root).as_posix().encode())
            digest.update(file.read_bytes())

    loader = FileSystemLoader(str(root))
    env_html = Environment(
        loader=loader,
        autoescape=select_autoescape(["html", "j2"], default=True),
        undefined=StrictUndefined,
    )
    env_text = Environment(loader=loader, autoescape=False, undefined=StrictUndefined)
    registry = Registry(templates, digest.hexdigest(), env_html, env_text)
    for template in templates.values():
        render(registry, template.key, template.data_example, "Người nhận", "https://app.example")
    return registry


def render(registry: Registry, key: str, data: dict, recipient_name: str | None, base_url: str) -> Rendered:
    template = registry.get(key)
    if template is None:
        raise TemplateError(f"template không tồn tại: {key}")
    context = {
        **template.prune(data),
        "recipient_name": sanitize_header(recipient_name or ""),
        "base_url": base_url.rstrip("/"),
        "brand": {"name": "DYC"},
    }
    try:
        subject = sanitize_header(registry.env_text.from_string(template.subject).render(**context))
        html = registry.env_html.get_template(f"{key}/body.html.j2").render(**context)
        text = registry.env_text.get_template(f"{key}/body.txt.j2").render(**context)
    except Exception as error:
        raise TemplateError(f"{key}: {error}") from error
    return Rendered(subject=subject, html=css_inline.inline(html), text=text)


TEMPLATES_ROOT = Path(__file__).resolve().parent.parent / "templates"


def get_registry(root: Path | None = None) -> Registry:
    return load_registry(root or TEMPLATES_ROOT)

