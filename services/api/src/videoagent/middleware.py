import asyncio
import time
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


class CSRFMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: object, allowed_origins: list[str]) -> None:
        super().__init__(app)  # type: ignore[arg-type]
        self.allowed_origins = set(allowed_origins)

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if request.method in UNSAFE_METHODS:
            origin = request.headers.get("origin")
            fetch_site = request.headers.get("sec-fetch-site")
            if (origin and origin not in self.allowed_origins) or fetch_site == "cross-site":
                return JSONResponse(
                    status_code=403,
                    content={
                        "error": {
                            "code": "CSRF_ORIGIN_REJECTED",
                            "message": "The request origin is not allowed.",
                            "details": {},
                            "requestId": request.headers.get("x-request-id", "unknown"),
                        }
                    },
                )
        return await call_next(request)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app: object,
        *,
        auth_limit: int,
        generation_limit: int,
        upload_limit: int,
    ) -> None:
        super().__init__(app)  # type: ignore[arg-type]
        self.limits = {
            "auth": auth_limit,
            "generation": generation_limit,
            "upload": upload_limit,
        }
        self.windows: dict[tuple[str, str], tuple[int, int]] = {}
        self.lock = asyncio.Lock()

    def _bucket(self, request: Request) -> str | None:
        if request.method != "POST":
            return None
        path = request.url.path
        if path.endswith(("/auth/login", "/auth/register")):
            return "auth"
        if path.endswith("/generate") or path.endswith("/exports"):
            return "generation"
        if path.endswith("/assets"):
            return "upload"
        return None

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        bucket = self._bucket(request)
        if bucket is None:
            return await call_next(request)

        client = request.client.host if request.client else "unknown"
        window = int(time.monotonic() // 60)
        key = (bucket, client)
        limit = self.limits[bucket]
        async with self.lock:
            current_window, count = self.windows.get(key, (window, 0))
            if current_window != window:
                count = 0
            if count >= limit:
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": {
                            "code": "RATE_LIMITED",
                            "message": "Too many requests. Try again later.",
                            "details": {"bucket": bucket, "limit": limit},
                            "requestId": request.headers.get(
                                "x-request-id",
                                "unknown",
                            ),
                        }
                    },
                )
            self.windows[key] = (window, count + 1)
        return await call_next(request)
