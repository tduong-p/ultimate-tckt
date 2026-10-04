from typing import Optional


def apply_policy(
    email: str,
    allowlist: Optional[list[str]],
    redirect_to: Optional[str],
) -> Optional[str]:
    if not allowlist:
        return email

    email_lower = email.strip().lower()
    email_domain = email_lower.split("@")[-1] if "@" in email_lower else ""

    for item in allowlist:
        rule = item.strip().lower()
        if not rule:
            continue
        if "@" in rule:
            if email_lower == rule:
                return email
        else:
            if email_domain == rule:
                return email

    if redirect_to:
        return redirect_to.strip()
    return None


def merge_always_cc(cc: list[str], always_cc: Optional[list[str]], recipient: str) -> list[str]:
    """Thêm các địa chỉ CC cố định của vận hành vào cuối `cc`.

    Bỏ trùng không phân biệt hoa thường (giữ thứ tự, giữ nguyên chữ của lần xuất hiện đầu) và bỏ địa chỉ
    trùng người nhận cuối cùng. Các địa chỉ cố định do vận hành cấu hình nên cố ý không qua allowlist;
    gọi hàm này chỉ sau khi người nhận đã qua allowlist.
    """
    recipient_key = recipient.strip().lower()
    seen = {recipient_key}
    merged: list[str] = []
    for addr in [*cc, *(always_cc or [])]:
        addr = addr.strip()
        key = addr.lower()
        if not addr or key in seen:
            continue
        seen.add(key)
        merged.append(addr)
    return merged
