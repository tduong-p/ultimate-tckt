from noti.recipient_policy import apply_policy


def test_empty_allowlist_sends_everything():
    assert apply_policy("a@x.vn", [], None) == "a@x.vn"
    assert apply_policy("a@x.vn", None, None) == "a@x.vn"


def test_allowed_domain_and_address():
    # Domain without @ matches domain part of email case-insensitively
    assert apply_policy("a@hust.edu.vn", ["hust.edu.vn"], None) == "a@hust.edu.vn"
    assert apply_policy("A@Hust.Edu.Vn", ["hust.edu.vn"], None) == "A@Hust.Edu.Vn"
    # Specific address with @ matches full email case-insensitively
    assert apply_policy("a@x.vn", ["a@x.vn"], None) == "a@x.vn"
    assert apply_policy("A@X.VN", ["a@x.vn"], None) == "A@X.VN"


def test_outside_allowlist_redirects_or_drops():
    # Outside allowlist with redirect_to returns redirect target
    assert apply_policy("a@gmail.com", ["hust.edu.vn"], "qa@hust.edu.vn") == "qa@hust.edu.vn"
    # Outside allowlist without redirect_to returns None (dropped)
    assert apply_policy("a@gmail.com", ["hust.edu.vn"], None) is None
