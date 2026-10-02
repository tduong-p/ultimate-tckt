from typing import Optional
import httpx
import msal

from noti.drivers.base import Driver, Message, PermanentError, TransientError


class GraphDriver(Driver):
    def __init__(
        self,
        tenant_id: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        certificate_path: Optional[str] = None,
        certificate_thumbprint: Optional[str] = None,
        mail_from: Optional[str] = None,
        timeout: int = 30,
        transport: Optional[httpx.BaseTransport] = None,
    ):
        self.tenant_id = tenant_id or ""
        self.client_id = client_id or ""
        self.client_secret = client_secret or ""
        self.certificate_path = certificate_path
        self.certificate_thumbprint = certificate_thumbprint or ""
        self.mail_from = mail_from or "noreply@hust.edu.vn"
        self.timeout = timeout
        self.transport = transport
        self._app = None  # MSAL tự cache token trong app; tạo một lần cho mỗi driver

    def _msal_app(self):
        if self._app is None:
            if self.certificate_path:
                with open(self.certificate_path, "r", encoding="utf-8") as f:
                    credential = {"private_key": f.read(), "thumbprint": self.certificate_thumbprint}
            else:
                credential = self.client_secret
            self._app = msal.ConfidentialClientApplication(
                self.client_id,
                authority=f"https://login.microsoftonline.com/{self.tenant_id}",
                client_credential=credential,
            )
        return self._app

    def _get_token(self) -> str:
        result = self._msal_app().acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
        if "access_token" not in result:
            err = result.get("error_description", result.get("error", "Unknown MSAL auth failure"))
            raise PermanentError(f"MSAL authentication failed: {err}")
        return result["access_token"]

    def send(self, message: Message) -> None:
        token = self._get_token()
        url = f"https://graph.microsoft.com/v1.0/users/{self.mail_from}/sendMail"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        recipient_payload = {"emailAddress": {"address": message.to_email}}
        if message.to_name:
            recipient_payload["emailAddress"]["name"] = message.to_name

        payload = {
            "message": {
                "subject": message.subject,
                "body": {
                    "contentType": "HTML",
                    "content": message.html,
                },
                "toRecipients": [recipient_payload],
                "ccRecipients": [
                    {"emailAddress": {"address": cc_email}} for cc_email in message.cc
                ],
            },
            "saveToSentItems": False,
        }

        if message.reply_to:
            payload["message"]["replyTo"] = [
                {"emailAddress": {"address": message.reply_to}}
            ]

        try:
            with httpx.Client(transport=self.transport, timeout=self.timeout) as client:
                res = client.post(url, json=payload, headers=headers)
        except (httpx.ConnectError, httpx.TimeoutException, httpx.NetworkError) as e:
            raise TransientError(f"Network error connecting to Microsoft Graph: {e}")
        except Exception as e:
            raise TransientError(f"Unexpected HTTP client error: {e}")

        if res.status_code in (200, 202, 204):
            return

        if res.status_code == 429:
            retry_after_str = res.headers.get("Retry-After")
            retry_after = None
            if retry_after_str:
                try:
                    retry_after = int(retry_after_str)
                except (ValueError, TypeError):
                    pass
            raise TransientError(f"Microsoft Graph 429 Rate Limit: {res.text}", retry_after=retry_after)

        if 500 <= res.status_code < 600:
            raise TransientError(f"Microsoft Graph server error {res.status_code}: {res.text}")

        if res.status_code in (401, 403):
            raise PermanentError(f"Microsoft Graph auth/permission error {res.status_code}: {res.text}")

        if res.status_code in (400, 404):
            raise PermanentError(f"Microsoft Graph client/recipient error {res.status_code}: {res.text}")

        # Any other 4xx
        if 400 <= res.status_code < 500:
            raise PermanentError(f"Microsoft Graph 4xx error {res.status_code}: {res.text}")

        raise TransientError(f"Microsoft Graph unexpected status {res.status_code}: {res.text}")
