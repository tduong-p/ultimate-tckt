from noti.status import overall_status


def test_overall_status():
    assert overall_status(["sent", "sent"]) == "sent"
    assert overall_status(["sent", "pending"]) == "pending"
    assert overall_status(["failed", "failed"]) == "failed"
    assert overall_status(["sent", "failed"]) == "partial"
    assert overall_status(["sent", "expired"]) == "partial"
    assert overall_status(["expired", "expired"]) == "failed"
