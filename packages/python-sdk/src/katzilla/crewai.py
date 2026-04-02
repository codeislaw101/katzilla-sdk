"""CrewAI adapter — wraps each Katzilla data source as a CrewAI Tool."""

from __future__ import annotations

from typing import Any

from .client import Katzilla


def _import_base_tool() -> type:
    try:
        from crewai.tools import BaseTool
    except ImportError as e:
        raise ImportError(
            "crewai is required for the CrewAI adapter. "
            "Install it with: pip install katzilla[crewai]"
        ) from e
    return BaseTool


def get_katzilla_tools(api_key: str, base_url: str | None = None) -> list[Any]:
    """Create CrewAI tools for all Katzilla data sources.

    Usage::

        from katzilla.crewai import get_katzilla_tools

        tools = get_katzilla_tools(api_key="kz_abc123")
        agent = Agent(tools=tools, ...)
    """
    BaseTool = _import_base_tool()
    client = Katzilla(api_key=api_key, base_url=base_url or "https://api.katzilla.dev")
    defs = client.get_tools()

    tools = []
    for d in defs:
        def _make_tool(
            tool_name: str = d["name"],
            tool_desc: str = d["description"],
        ) -> Any:
            class KatzillaTool(BaseTool):  # type: ignore[misc]
                name: str = tool_name
                description: str = tool_desc

                def _run(self, **kwargs: Any) -> str:
                    import json

                    result = client.execute_tool_call(tool_name, kwargs)
                    return json.dumps(result.get("data", result), default=str)

            return KatzillaTool()

        tools.append(_make_tool())

    return tools
