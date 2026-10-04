from noti.config import settings


class BodyLimitMiddleware:
    """Pure-ASGI request body limiter: stops reading as soon as the limit is exceeded."""

    def __init__(self, app, max_bytes: int | None = None):
        self.app = app
        self.max_bytes = max_bytes

    def _limit(self) -> int:
        return self.max_bytes if self.max_bytes is not None else settings.max_body_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        limit = self._limit()
        for name, value in scope.get("headers", []):
            if name == b"content-length":
                try:
                    if int(value) > limit:
                        await self._too_large(send)
                        return
                except ValueError:
                    pass
                break

        chunks: list[bytes] = []
        total = 0
        while True:
            message = await receive()
            if message["type"] != "http.request":
                return  # client disconnected while uploading
            body = message.get("body", b"")
            total += len(body)
            if total > limit:
                await self._too_large(send)
                return
            chunks.append(body)
            if not message.get("more_body", False):
                break

        replayed = False

        async def replay():
            nonlocal replayed
            if not replayed:
                replayed = True
                return {"type": "http.request", "body": b"".join(chunks), "more_body": False}
            return await receive()

        await self.app(scope, replay, send)

    @staticmethod
    async def _too_large(send):
        await send({"type": "http.response.start", "status": 413,
                    "headers": [(b"content-length", b"0")]})
        await send({"type": "http.response.body", "body": b""})
