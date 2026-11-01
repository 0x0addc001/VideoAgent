import base64
import hashlib
from typing import Any
from urllib.parse import urlencode

import httpx
from pydantic import BaseModel

from videoagent.config import Settings


class OAuthTokens(BaseModel):
    access_token: str
    refresh_token: str | None = None
    expires_in: int | None = None
    token_type: str = "Bearer"


class KlingOAuthGateway:
    async def register_client(self, *, redirect_uri: str, scopes: list[str]) -> str:
        raise NotImplementedError

    def authorization_url(
        self,
        *,
        client_id: str,
        redirect_uri: str,
        state: str,
        code_challenge: str,
        scopes: list[str],
        resource: str,
    ) -> str:
        raise NotImplementedError

    async def exchange_code(
        self,
        *,
        code: str,
        client_id: str,
        redirect_uri: str,
        code_verifier: str,
        resource: str,
    ) -> OAuthTokens:
        raise NotImplementedError

    async def refresh_access_token(
        self,
        *,
        refresh_token: str,
        client_id: str,
        resource: str,
    ) -> OAuthTokens:
        raise NotImplementedError


class HTTPKlingOAuthGateway(KlingOAuthGateway):
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._auth_base = settings.kling_auth_base_url.rstrip("/")

    async def register_client(self, *, redirect_uri: str, scopes: list[str]) -> str:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                f"{self._auth_base}/register",
                json={
                    "client_name": "VideoAgent",
                    "redirect_uris": [redirect_uri],
                    "grant_types": ["authorization_code", "refresh_token"],
                    "response_types": ["code"],
                    "token_endpoint_auth_method": "none",
                    "scope": " ".join(scopes),
                },
            )
            response.raise_for_status()
            payload = response.json()
        client_id = payload.get("client_id")
        if not isinstance(client_id, str) or not client_id:
            raise ValueError("Kling OAuth registration did not return a client_id")
        return client_id

    def authorization_url(
        self,
        *,
        client_id: str,
        redirect_uri: str,
        state: str,
        code_challenge: str,
        scopes: list[str],
        resource: str,
    ) -> str:
        query = urlencode(
            {
                "response_type": "code",
                "client_id": client_id,
                "state": state,
                "code_challenge": code_challenge,
                "code_challenge_method": "S256",
                "redirect_uri": redirect_uri,
                "scope": " ".join(scopes),
                "resource": resource,
            }
        )
        return f"{self._auth_base}/authorize?{query}"

    async def exchange_code(
        self,
        *,
        code: str,
        client_id: str,
        redirect_uri: str,
        code_verifier: str,
        resource: str,
    ) -> OAuthTokens:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                f"{self._auth_base}/token",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": client_id,
                    "redirect_uri": redirect_uri,
                    "code_verifier": code_verifier,
                    "resource": resource,
                },
            )
            response.raise_for_status()
            payload: dict[str, Any] = response.json()
        return OAuthTokens.model_validate(payload)

    async def refresh_access_token(
        self,
        *,
        refresh_token: str,
        client_id: str,
        resource: str,
    ) -> OAuthTokens:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                f"{self._auth_base}/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": client_id,
                    "resource": resource,
                },
            )
            response.raise_for_status()
            payload: dict[str, Any] = response.json()
        return OAuthTokens.model_validate(payload)


def build_kling_oauth_gateway(settings: Settings) -> KlingOAuthGateway:
    return HTTPKlingOAuthGateway(settings)


def pkce_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
