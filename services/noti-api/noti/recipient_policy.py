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
