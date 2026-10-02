def test_health_needs_no_key(client):
    r = client.get("/v1/health")
    assert r.status_code == 200 and r.json() == {"status": "ok"}
