def overall_status(statuses: list[str]) -> str:
    """
    Quy ước (§6, SPEC-NOTI-003 §3.5):
    - 'pending' nếu còn người 'pending' hoặc 'sending'
    - bỏ mọi người 'suppressed' (bị allowlist chặn, không tính vào kết quả); nếu không còn ai -> 'suppressed'
    - 'sent' nếu tất cả 'sent'
    - 'failed' nếu không ai 'sent' (bao gồm toàn failed, toàn expired)
    - 'partial' nếu có cả 'sent' lẫn 'failed'/'expired'
    """
    if any(s in ("pending", "sending") for s in statuses):
        return "pending"
    statuses = [s for s in statuses if s != "suppressed"]
    if not statuses:
        return "suppressed"
    if all(s == "sent" for s in statuses):
        return "sent"
    if not any(s == "sent" for s in statuses):
        return "failed"
    return "partial"
