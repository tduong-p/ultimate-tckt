import asyncio

from noti.body_limit import BodyLimitMiddleware
from noti.config import settings


def run(coro):
    return asyncio.run(coro)


class Harness:
    def __init__(self, messages):
        self.messages = list(messages)
        self.receive_calls = 0
        self.sent = []
        self.app_called = False
        self.app_body = b""
        self.app_msgs = []

    async def receive(self):
        self.receive_calls += 1
        if self.messages:
            return self.messages.pop(0)
        return {"type": "http.disconnect"}

    async def send(self, message):
        self.sent.append(message)

    async def app(self, scope, receive, send):
        self.app_called = True
        while True:
            msg = await receive()
            self.app_msgs.append(msg)
            if msg["type"] == "http.request":
                self.app_body += msg.get("body", b"")
                if not msg.get("more_body"):
                    break
            else:
                break
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"ok"})

    def status(self):
        return self.sent[0]["status"]


def scope(headers=()):
    return {"type": "http", "headers": list(headers)}


def chunk(data, more=True):
    return {"type": "http.request", "body": data, "more_body": more}


def test_content_length_over_limit_is_413_without_reading_body():
    h = Harness([chunk(b"x", False)])
    mw = BodyLimitMiddleware(h.app, max_bytes=10)
    run(mw(scope([(b"content-length", b"11")]), h.receive, h.send))
    assert h.status() == 413
    assert h.receive_calls == 0
    assert not h.app_called


def test_chunked_over_limit_stops_reading_early():
    h = Harness([chunk(b"x" * 1024) for _ in range(100)])
    mw = BodyLimitMiddleware(h.app, max_bytes=4096)
    run(mw(scope(), h.receive, h.send))
    assert h.status() == 413
    assert h.receive_calls <= 5
    assert not h.app_called


def test_valid_chunked_body_reaches_app_intact():
    h = Harness([chunk(b"ab"), chunk(b"cd"), chunk(b"ef", False)])
    mw = BodyLimitMiddleware(h.app, max_bytes=100)
    run(mw(scope(), h.receive, h.send))
    assert h.status() == 200
    assert h.app_body == b"abcdef"


def test_disconnect_while_reading_does_not_call_app():
    h = Harness([chunk(b"ab"), {"type": "http.disconnect"}])
    mw = BodyLimitMiddleware(h.app, max_bytes=100)
    run(mw(scope(), h.receive, h.send))
    assert not h.app_called
    assert h.sent == []


def test_non_http_scope_passthrough():
    seen = {}

    async def app(sc, receive, send):
        seen["scope"] = sc["type"]

    mw = BodyLimitMiddleware(app, max_bytes=1)
    run(mw({"type": "lifespan"}, None, None))
    assert seen["scope"] == "lifespan"


def test_default_limit_reads_settings(monkeypatch):
    h = Harness([chunk(b"x" * 20, False)])
    mw = BodyLimitMiddleware(h.app)
    monkeypatch.setattr(settings, "max_body_bytes", 10)
    run(mw(scope(), h.receive, h.send))
    assert h.status() == 413
    h2 = Harness([chunk(b"x" * 20, False)])
    monkeypatch.setattr(settings, "max_body_bytes", 100)
    run(BodyLimitMiddleware(h2.app)(scope(), h2.receive, h2.send))
    assert h2.status() == 200
