"""CrewAI adapter — wraps each Katzilla data source as a CrewAI Tool."""

from __future__ import annotations

import json
from typing import Any

from .client import Katzilla


def get_katzilla_tools(
    api_key: str,
    base_url: str | None = None,
    include: list[str] | None = None,
) -> list[Any]:
    """Create CrewAI tools for all Katzilla data sources.

    Args:
        api_key: Katzilla API key (kz_xxx).
        base_url: Override the API base URL.
        include: Optional list of tool name patterns to include.

    Usage::

        from crewai import Agent, Task, Crew
        from katzilla.crewai import get_katzilla_tools

        tools = get_katzilla_tools(api_key="kz_abc123")
        researcher = Agent(
            role="Data Researcher",
            tools=tools,
            llm="gpt-4o",
        )
    """
    try:
        from crewai.tools import BaseTool
    except ImportError as e:
        raise ImportError(
            "crewai is required for the CrewAI adapter. "
            "Install it with: pip install katzilla[crewai]"
        ) from e

    client = Katzilla(api_key=api_key, base_url=base_url or "https://api.katzilla.dev")
    defs = client.get_tools()

    tools = []
    for d in defs:
        tool_name = d["name"]

        if include and not any(pat in tool_name for pat in include):
            continue

        tool_desc = d["description"]

        def _make_tool(
            _name: str = tool_name,
            _desc: str = tool_desc,
        ) -> Any:
            class KatzillaTool(BaseTool):  # type: ignore[misc]
                name: str = _name
                description: str = _desc

                def _run(self, **kwargs: Any) -> str:
                    result = client.execute_tool_call(_name, kwargs)
                    return json.dumps(result.data, default=str)

            return KatzillaTool()

        tools.append(_make_tool())

    return tools
