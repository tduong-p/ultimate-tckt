from noti.status import overall_status


def test_overall_status():
    assert overall_status(["sent", "sent"]) == "sent"
    assert overall_status(["sent", "pending"]) == "pending"
    assert overall_status(["failed", "failed"]) == "failed"
    assert overall_status(["sent", "failed"]) == "partial"
    assert overall_status(["sent", "expired"]) == "partial"
    assert overall_status(["expired", "expired"]) == "failed"


def test_overall_status_suppressed():
    assert overall_status(["suppressed"]) == "suppressed"
    assert overall_status(["suppressed", "suppressed"]) == "suppressed"
    assert overall_status(["suppressed", "sent"]) == "sent"
    assert overall_status(["suppressed", "failed"]) == "failed"
    assert overall_status(["suppressed", "sent", "failed"]) == "partial"
    assert overall_status(["suppressed", "pending"]) == "pending"
