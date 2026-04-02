"""Convert Katzilla tool definitions to OpenAI function calling format."""

from __future__ import annotations

from typing import Any

from .client import Katzilla


def as_openai_tools(client: Katzilla) -> list[dict[str, Any]]:
    """Fetch Katzilla tools and format them as OpenAI function tool definitions.

    Also compatible with OpenClaw (same format).

    Usage::

        kz = Katzilla(api_key="kz_abc123")
        tools = as_openai_tools(kz)
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=tools,
        )
    """
    defs = client.get_tools()
    return [
        {
            "type": "function",
            "function": {
                "name": d["name"],
                "description": d["description"],
                "parameters": d["inputSchema"],
            },
        }
        for d in defs
    ]
