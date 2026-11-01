import json
from typing import Any

from httpx2 import AsyncClient
from mcp import ClientSession, types
from mcp.client.streamable_http import streamable_http_client


def result_payload(result: types.CallToolResult | types.Result) -> dict[str, Any]:
    structured = getattr(result, "structured_content", None)
    if isinstance(structured, dict):
        return structured

    is_error = bool(getattr(result, "is_error", False))
    content = getattr(result, "content", [])
    text_parts = [
        item.text
        for item in content
        if getattr(item, "type", None) == "text" and isinstance(getattr(item, "text", None), str)
    ]
    if is_error:
        raise RuntimeError("Kling MCP tool returned an error: " + " ".join(text_parts))
    if text_parts:
        combined = "\n".join(text_parts)
        try:
            parsed = json.loads(combined)
        except json.JSONDecodeError:
            return {"text": combined}
        if isinstance(parsed, dict):
            return parsed
        return {"data": parsed}
    return {}


class StreamableHTTPToolClient:
    def __init__(self, url: str, access_token: str) -> None:
        self._url = url
        self._http_client = AsyncClient(headers={"Authorization": f"Bearer {access_token}"})

    async def call_tool(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        async with (
            self._http_client,
            streamable_http_client(
                self._url,
                http_client=self._http_client,
            ) as (read_stream, write_stream),
            ClientSession(
                read_stream,
                write_stream,
            ) as session,
        ):
            await session.initialize()
            result = await session.call_tool(name, arguments)
            return result_payload(result)
