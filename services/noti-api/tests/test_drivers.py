import json
import email
import smtplib
import ssl
from unittest.mock import MagicMock
import httpx
import pytest

from noti.config import Settings
from noti.drivers import (
    ConsoleDriver,
    GraphDriver,
    Message,
    PermanentError,
    SmtpDriver,
    TransientError,
    get_driver,
)


def test_get_driver_defaults_and_unknown():
    s = Settings(database_url="postgresql+psycopg://postgres:postgres@localhost:5432/noti_test")
    driver = get_driver(s)
    assert isinstance(driver, ConsoleDriver)

    s_unknown = Settings(
        database_url="postgresql+psycopg://postgres:postgres@localhost:5432/noti_test",
        mail_driver="unknown_vendor",
    )
    with pytest.raises(ValueError, match="Unknown mail driver"):
        get_driver(s_unknown)


def test_console_driver():
    driver = ConsoleDriver()
    msg = Message(
        to_email="test@example.com",
        to_name="Tester",
        cc=["cc@example.com"],
        reply_to="reply@example.com",
        subject="[DYC] Hello",
        html="<p>Hello</p>",
        text="Hello",
    )
    driver.send(msg)
    assert len(driver.outbox) == 1
    assert driver.outbox[0].subject == "[DYC] Hello"


def test_smtp_driver_success_and_errors(monkeypatch):
    driver = SmtpDriver(host="smtp.example.com", port=587, user="u", password="p", mail_from="noreply@example.com")
    msg = Message(
        to_email="recipient@example.com",
        to_name="Recipient Name",
        cc=["cc1@example.com"],
        reply_to="reply@example.com",
        subject="[DYC] Test Subject",
        html="<b>Test</b>",
        text="Test",
    )

    # 1. Success case
    mock_server = MagicMock()
    monkeypatch.setattr(smtplib, "SMTP", lambda host, port, timeout: mock_server)
    mock_server.__enter__.return_value = mock_server

    driver.send(msg)
    mock_server.starttls.assert_called_once()
    mock_server.login.assert_called_once_with("u", "p")
    mock_server.send_message.assert_called_once()
    sent = mock_server.send_message.call_args[0][0]
    assert sent["Date"] and sent["Message-ID"]

    # 2. Permanent error (5xx code)
    mock_server.send_message.side_effect = smtplib.SMTPResponseException(550, b"User unknown")
    with pytest.raises(PermanentError, match="550"):
        driver.send(msg)

    # 3. Permanent error (RecipientsRefused)
    mock_server.send_message.side_effect = smtplib.SMTPRecipientsRefused({"recipient@example.com": (550, b"No such user")})
    with pytest.raises(PermanentError, match="refused"):
        driver.send(msg)

    # 4. Transient error (4xx code)
    mock_server.send_message.side_effect = smtplib.SMTPResponseException(421, b"Try again later")
    with pytest.raises(TransientError, match="421"):
        driver.send(msg)

    # 5. Transient error (Connection/Timeout)
    mock_server.send_message.side_effect = TimeoutError("Timed out")
    with pytest.raises(TransientError, match="network error"):
        driver.send(msg)


def test_graph_driver_responses(monkeypatch):
    # Monkeypatch _get_token
    monkeypatch.setattr(GraphDriver, "_get_token", lambda self: "fake-jwt-token")

    msg = Message(
        to_email="student@hust.edu.vn",
        to_name="Student",
        cc=[],
        reply_to=None,
        subject="[DYC] Notice",
        html="<p>Info</p>",
        text="Info",
    )

    # 1. 202 Accepted
    def handle_202(request: httpx.Request):
        assert request.headers["Authorization"] == "Bearer fake-jwt-token"
        assert json.loads(request.content)["saveToSentItems"] is False
        return httpx.Response(202)

    driver = GraphDriver(mail_from="sender@hust.edu.vn", transport=httpx.MockTransport(handle_202))
    driver.send(msg)  # No error raised

    # 2. 429 Rate Limit with Retry-After
    def handle_429(request: httpx.Request):
        return httpx.Response(429, headers={"Retry-After": "120"}, text="Too Many Requests")

    driver = GraphDriver(mail_from="sender@hust.edu.vn", transport=httpx.MockTransport(handle_429))
    with pytest.raises(TransientError) as exc_info:
        driver.send(msg)
    assert exc_info.value.retry_after == 120

    # 3. 503 Service Unavailable
    def handle_503(request: httpx.Request):
        return httpx.Response(503, text="Service Unavailable")

    driver = GraphDriver(mail_from="sender@hust.edu.vn", transport=httpx.MockTransport(handle_503))
    with pytest.raises(TransientError, match="503"):
        driver.send(msg)

    # 4. 400 Bad Request
    def handle_400(request: httpx.Request):
        return httpx.Response(400, text="Bad Request / Invalid recipient")

    driver = GraphDriver(mail_from="sender@hust.edu.vn", transport=httpx.MockTransport(handle_400))
    with pytest.raises(PermanentError, match="400"):
        driver.send(msg)

    # 5. 403 Forbidden
    def handle_403(request: httpx.Request):
        return httpx.Response(403, text="Forbidden / Mail.Send missing")

    driver = GraphDriver(mail_from="sender@hust.edu.vn", transport=httpx.MockTransport(handle_403))
    with pytest.raises(PermanentError, match="403"):
        driver.send(msg)


def test_get_driver_builds_graph_and_smtp_from_settings():
    s = Settings(
        database_url="postgresql+psycopg://x/y",
        mail_driver="graph",
        graph_tenant="tenant-1",
        graph_client_id="client-1",
        graph_client_secret="s",
        mail_from="noti@example.com",
    )
    driver = get_driver(s)
    assert isinstance(driver, GraphDriver)
    assert driver.tenant_id == "tenant-1"
    assert driver.mail_from == "noti@example.com"

    smtp = get_driver(Settings(database_url="postgresql+psycopg://x/y", mail_driver="smtp", smtp_host="h"))
    assert isinstance(smtp, SmtpDriver)


def test_graph_driver_reuses_msal_app_and_passes_thumbprint(monkeypatch, tmp_path):
    created = []

    class FakeApp:
        def __init__(self, client_id, authority, client_credential, **kwargs):
            created.append(client_credential)

        def acquire_token_for_client(self, scopes):
            return {"access_token": "t"}

    monkeypatch.setattr("noti.drivers.graph.msal.ConfidentialClientApplication", FakeApp)
    key = tmp_path / "key.pem"
    key.write_text("PRIVATE KEY")
    driver = GraphDriver(
        tenant_id="t", client_id="c", certificate_path=str(key), certificate_thumbprint="AB12",
        mail_from="noti@example.com", transport=httpx.MockTransport(lambda r: httpx.Response(202)),
    )
    msg = Message(to_email="a@example.com", to_name=None, cc=[], reply_to=None, subject="s", html="h", text="t")
    driver.send(msg)
    driver.send(msg)
    assert len(created) == 1
    assert created[0] == {"private_key": "PRIVATE KEY", "thumbprint": "AB12"}


def test_console_driver_outbox_is_bounded_and_logs_no_content(caplog):
    driver = ConsoleDriver()
    msg = Message(to_email="a@example.com", to_name="A", cc=[], reply_to=None,
                  subject="Bí mật nội bộ", html="h", text="t")
    with caplog.at_level("INFO"):
        for _ in range(ConsoleDriver.MAX_OUTBOX + 5):
            driver.send(msg)
    assert len(driver.outbox) == ConsoleDriver.MAX_OUTBOX
    assert "Bí mật nội bộ" not in caplog.text
    assert "a@example.com" not in caplog.text


# --- #49 Noti: chứng chỉ SMTP, phân loại lỗi, timeout MSAL ---

_MSG = Message(to_email="a@example.com", to_name=None, cc=[], reply_to=None, subject="s", html="h", text="t")


def _smtp_driver_with(monkeypatch, server):
    server.__enter__.return_value = server
    monkeypatch.setattr(smtplib, "SMTP", lambda host, port, timeout: server)
    return SmtpDriver(host="h", user="u", password="p", mail_from="n@example.com")


def test_smtp_starttls_uses_verifying_context(monkeypatch):
    server = MagicMock()
    driver = _smtp_driver_with(monkeypatch, server)
    driver.send(_MSG)
    ctx = server.starttls.call_args.kwargs["context"]
    assert ctx.verify_mode == ssl.CERT_REQUIRED
    assert ctx.check_hostname is True


@pytest.mark.parametrize("code", [530, 534, 535])
def test_smtp_auth_codes_are_transient(monkeypatch, code):
    server = MagicMock()
    driver = _smtp_driver_with(monkeypatch, server)
    server.login.side_effect = smtplib.SMTPAuthenticationError(code, b"auth failed")
    with pytest.raises(TransientError):
        driver.send(_MSG)


def test_smtp_550_is_permanent(monkeypatch):
    server = MagicMock()
    driver = _smtp_driver_with(monkeypatch, server)
    server.send_message.side_effect = smtplib.SMTPResponseException(550, b"no")
    with pytest.raises(PermanentError):
        driver.send(_MSG)


def test_smtp_recipients_refused_mixed_codes_is_transient(monkeypatch):
    server = MagicMock()
    driver = _smtp_driver_with(monkeypatch, server)
    server.send_message.side_effect = smtplib.SMTPRecipientsRefused(
        {"a@example.com": (550, b"no"), "b@example.com": (450, b"later")}
    )
    with pytest.raises(TransientError):
        driver.send(_MSG)


def test_smtp_recipients_refused_all_5xx_is_permanent(monkeypatch):
    server = MagicMock()
    driver = _smtp_driver_with(monkeypatch, server)
    server.send_message.side_effect = smtplib.SMTPRecipientsRefused(
        {"a@example.com": (550, b"no"), "b@example.com": (553, b"bad")}
    )
    with pytest.raises(PermanentError):
        driver.send(_MSG)


def test_smtp_ssl_error_is_transient(monkeypatch):
    server = MagicMock()
    driver = _smtp_driver_with(monkeypatch, server)
    server.starttls.side_effect = ssl.SSLCertVerificationError("bad cert")
    with pytest.raises(TransientError):
        driver.send(_MSG)


def test_graph_401_is_transient_403_is_permanent(monkeypatch):
    monkeypatch.setattr(GraphDriver, "_get_token", lambda self: "t")
    d401 = GraphDriver(mail_from="s@example.com", transport=httpx.MockTransport(lambda r: httpx.Response(401, text="x")))
    with pytest.raises(TransientError):
        d401.send(_MSG)
    d403 = GraphDriver(mail_from="s@example.com", transport=httpx.MockTransport(lambda r: httpx.Response(403, text="x")))
    with pytest.raises(PermanentError):
        d403.send(_MSG)


def _graph_with_app(monkeypatch, acquire):
    class FakeApp:
        def __init__(self, client_id, authority, client_credential, **kwargs):
            FakeApp.kwargs = kwargs

        def acquire_token_for_client(self, scopes):
            return acquire()

    monkeypatch.setattr("noti.drivers.graph.msal.ConfidentialClientApplication", FakeApp)
    return GraphDriver(tenant_id="t", client_id="c", client_secret="s", timeout=7), FakeApp


def test_msal_network_exception_is_transient(monkeypatch):
    import requests

    def boom():
        raise requests.ConnectionError("down")

    driver, _ = _graph_with_app(monkeypatch, boom)
    with pytest.raises(TransientError):
        driver._get_token()


def test_msal_invalid_client_is_permanent(monkeypatch):
    driver, _ = _graph_with_app(monkeypatch, lambda: {"error": "invalid_client", "error_description": "bad secret"})
    with pytest.raises(PermanentError):
        driver._get_token()


def test_msal_temporarily_unavailable_is_transient(monkeypatch):
    driver, _ = _graph_with_app(monkeypatch, lambda: {"error": "temporarily_unavailable", "retry_after": "30"})
    with pytest.raises(TransientError) as ei:
        driver._get_token()
    assert ei.value.retry_after == 30


def test_msal_5xx_status_in_result_is_transient(monkeypatch):
    driver, _ = _graph_with_app(monkeypatch, lambda: {"error": "x", "status_code": 503})
    with pytest.raises(TransientError):
        driver._get_token()


def test_msal_app_gets_timeout(monkeypatch):
    driver, App = _graph_with_app(monkeypatch, lambda: {"access_token": "tok"})
    assert driver._get_token() == "tok"
    assert App.kwargs["timeout"] == driver.timeout == 7


class _QuitFailsSMTP:
    """smtplib.SMTP giả: send_message thành công (hoặc lỗi theo ý), nhưng đóng phiên thì nổ."""

    def __init__(self, send_error=None):
        self.send_error = send_error
        self.sent = 0

    def starttls(self, context=None):
        pass

    def login(self, *a):
        pass

    def send_message(self, msg):
        if self.send_error:
            raise self.send_error
        self.sent += 1

    def quit(self):
        raise smtplib.SMTPResponseException(421, b"closing")

    def close(self):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.quit()


@pytest.mark.parametrize("code", [421, 550])
def test_smtp_quit_failure_after_send_is_not_an_error(monkeypatch, code):
    server = _QuitFailsSMTP()
    server.quit = lambda: (_ for _ in ()).throw(smtplib.SMTPResponseException(code, b"x"))
    monkeypatch.setattr(smtplib, "SMTP", lambda host, port, timeout: server)
    SmtpDriver(host="h", user="u", password="p", mail_from="n@example.com").send(_MSG)
    assert server.sent == 1


def test_smtp_send_error_still_classified_when_quit_also_fails(monkeypatch):
    server = _QuitFailsSMTP(send_error=smtplib.SMTPResponseException(550, b"no"))
    monkeypatch.setattr(smtplib, "SMTP", lambda host, port, timeout: server)
    with pytest.raises(PermanentError):
        SmtpDriver(host="h", user="u", password="p", mail_from="n@example.com").send(_MSG)


def test_smtp_delivers_to_cc_via_header_envelope(monkeypatch):
    driver = SmtpDriver(host="h", port=587, user="", password="", mail_from="noreply@example.com")
    msg = Message(to_email="a@example.com", to_name=None, cc=["x@example.com", "y@example.com"],
                  reply_to=None, subject="s", html="h", text="t")
    captured = {}

    class Srv:
        def starttls(self, **kw): pass
        def login(self, *a): pass
        def quit(self): pass
        def close(self): pass
        def send_message(self, m, *a, **kw):
            captured["m"] = m
            captured["args"] = a
            captured["kw"] = kw

    monkeypatch.setattr(smtplib, "SMTP", lambda host, port, timeout: Srv())
    driver.send(msg)
    # send_message lấy người nhận phong bì từ To/Cc/Bcc nếu không truyền to_addrs
    assert not captured["args"] and "to_addrs" not in captured["kw"]
    assert captured["m"]["Cc"] == "x@example.com, y@example.com"
