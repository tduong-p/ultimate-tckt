def overall_status(statuses: list[str]) -> str:
    """
    Quy ước (§6):
    - 'pending' nếu còn người 'pending' hoặc 'sending'
    - 'sent' nếu tất cả 'sent'
    - 'failed' nếu không ai 'sent' (bao gồm toàn failed, toàn expired)
    - 'partial' nếu có cả 'sent' lẫn 'failed'/'expired'
    """
    if any(s in ("pending", "sending") for s in statuses):
        return "pending"
    if all(s == "sent" for s in statuses):
        return "sent"
    if not any(s == "sent" for s in statuses):
        return "failed"
    return "partial"
