"""Convert Katzilla tool definitions to OpenAI function calling format."""

from __future__ import annotations

import json
from typing import Any

from .client import Katzilla


def as_openai_tools(client: Katzilla) -> list[dict[str, Any]]:
    """Fetch Katzilla tools and format them as OpenAI function tool definitions.

    Usage::

        from openai import OpenAI
        from katzilla import Katzilla, as_openai_tools

        kz = Katzilla(api_key="kz_abc123")
        tools = as_openai_tools(kz)

        openai = OpenAI()
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": "Get recent earthquakes"}],
            tools=tools,
        )

        # Handle tool calls
        for call in response.choices[0].message.tool_calls:
            result = kz.execute_tool_call(call.function.name, json.loads(call.function.arguments))
            print(result.data)
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


def handle_tool_calls(
    client: Katzilla,
    tool_calls: list[Any],
) -> list[dict[str, Any]]:
    """Process OpenAI tool call responses and return results.

    Usage::

        results = handle_tool_calls(kz, response.choices[0].message.tool_calls)
        for msg in results:
            messages.append(msg)  # Add tool results to conversation
    """
    results = []
    for call in tool_calls:
        try:
            args = json.loads(call.function.arguments) if isinstance(call.function.arguments, str) else call.function.arguments
            result = client.execute_tool_call(call.function.name, args)
            content = json.dumps(result.data, default=str)
        except Exception as e:
            content = json.dumps({"error": str(e)})

        results.append({
            "role": "tool",
            "tool_call_id": call.id,
            "content": content,
        })
    return results
