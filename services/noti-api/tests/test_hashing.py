from noti.hashing import payload_hash

R = [{"email": "A@x.vn", "name": "A"}, {"email": "b@x.vn", "name": "B"}]


def test_hash_ignores_order_case_and_extra_fields_by_caller():
    h1 = payload_hash("t", R, [], None, {"a": 1, "b": 2})
    h2 = payload_hash("t", list(reversed([{"email": "a@x.vn", "name": "A"}, R[1]])), [], None, {"b": 2, "a": 1})
    assert h1 == h2


def test_hash_changes_with_data():
    assert payload_hash("t", R, [], None, {"a": 1}) != payload_hash("t", R, [], None, {"a": 2})
