"""Anthropic Claude adapter — Katzilla tools formatted for Claude tool_use."""

from __future__ import annotations

import json
from typing import Any

from .client import Katzilla


def as_anthropic_tools(client: Katzilla) -> list[dict[str, Any]]:
    """Fetch Katzilla tools and format them for Anthropic Claude tool_use.

    Usage::

        import anthropic
        from katzilla import Katzilla
        from katzilla.anthropic_tools import as_anthropic_tools, handle_tool_calls

        kz = Katzilla(api_key="kz_abc123")
        tools = as_anthropic_tools(kz)

        client = anthropic.Anthropic()
        response = client.messages.create(
            model="claude-sonnet-4-6",
            messages=[{"role": "user", "content": "Get recent earthquakes over magnitude 5"}],
            tools=tools,
            max_tokens=4096,
        )

        # Handle tool use blocks
        results = handle_tool_calls(kz, response.content)
    """
    defs = client.get_tools()
    return [
        {
            "name": d["name"],
            "description": d["description"],
            "input_schema": d["inputSchema"],
        }
        for d in defs
    ]


def handle_tool_calls(
    client: Katzilla,
    content_blocks: list[Any],
) -> list[dict[str, Any]]:
    """Process Claude tool_use content blocks and return tool_result blocks.

    Args:
        client: Katzilla client instance.
        content_blocks: The content array from a Claude response.

    Returns:
        List of tool_result blocks to send back as the next user message.
    """
    results = []
    for block in content_blocks:
        if getattr(block, "type", None) != "tool_use":
            continue

        try:
            result = client.execute_tool_call(block.name, block.input)
            content = json.dumps(result.data, default=str)
            is_error = False
        except Exception as e:
            content = json.dumps({"error": str(e)})
            is_error = True

        results.append({
            "type": "tool_result",
            "tool_use_id": block.id,
            "content": content,
            "is_error": is_error,
        })
    return results
