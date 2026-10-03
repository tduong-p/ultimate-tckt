import hashlib
import json
import unicodedata


def _nfc(value):
    if isinstance(value, str):
        return unicodedata.normalize("NFC", value)
    if isinstance(value, dict):
        return {k: _nfc(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_nfc(v) for v in value]
    return value


def payload_hash(template: str, recipients: list[dict], cc: list[str], reply_to: str | None, data: dict) -> str:
    people = sorted(
        {
            (
                r["email"].lower(),
                r.get("name") or "",
                json.dumps(_nfc(r.get("variables") or {}), sort_keys=True),
            )
            for r in recipients
        }
    )
    body = {
        "t": template,
        "r": people,
        "cc": sorted({c.lower() for c in cc}),
        "rt": (reply_to or "").lower(),
        "d": _nfc(data),
    }
    text = json.dumps(body, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
