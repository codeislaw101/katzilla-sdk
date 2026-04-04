"""LangChain adapter — wraps each Katzilla data source as a LangChain Tool."""

from __future__ import annotations

import json
from typing import Any, Optional, Type

from .client import Katzilla


def _json_schema_to_pydantic_field(name: str, schema: dict[str, Any]) -> tuple[type, Any]:
    """Convert a JSON schema property to a (type, default) tuple."""
    from pydantic import Field

    type_map = {"string": str, "integer": int, "number": float, "boolean": bool, "array": list, "object": dict}
    field_type = type_map.get(schema.get("type", "string"), str)
    desc = schema.get("description", "")
    default = schema.get("default", ...)
    return (field_type, Field(default=default, description=desc))


def _build_args_schema(tool_schema: dict[str, Any]) -> Optional[Type]:
    """Build a Pydantic model from JSON Schema properties for LangChain args_schema."""
    try:
        from pydantic import create_model
    except ImportError:
        return None

    props = tool_schema.get("properties", {})
    if not props:
        return None

    required = set(tool_schema.get("required", []))
    fields: dict[str, Any] = {}
    for name, prop in props.items():
        field_type, field_default = _json_schema_to_pydantic_field(name, prop)
        if name not in required and field_default is ...:
            fields[name] = (Optional[field_type], None)
        else:
            fields[name] = (field_type, field_default)

    return create_model("KatzillaToolInput", **fields)


def get_katzilla_tools(
    api_key: str,
    base_url: str | None = None,
    include: list[str] | None = None,
) -> list[Any]:
    """Create LangChain tools for all Katzilla data sources.

    Args:
        api_key: Katzilla API key (kz_xxx).
        base_url: Override the API base URL.
        include: Optional list of tool name patterns to include (e.g. ["hazards__", "economic__"]).

    Usage::

        from katzilla.langchain import get_katzilla_tools
        from langchain_openai import ChatOpenAI
        from langchain.agents import create_tool_calling_agent, AgentExecutor

        tools = get_katzilla_tools(api_key="kz_abc123")
        llm = ChatOpenAI(model="gpt-4o")
        agent = create_tool_calling_agent(llm, tools, prompt)
        executor = AgentExecutor(agent=agent, tools=tools)
    """
    try:
        from langchain_core.tools import BaseTool
    except ImportError as e:
        raise ImportError(
            "langchain-core is required for the LangChain adapter. "
            "Install it with: pip install katzilla[langchain]"
        ) from e

    client = Katzilla(api_key=api_key, base_url=base_url or "https://api.katzilla.dev")
    defs = client.get_tools()

    tools = []
    for d in defs:
        tool_name = d["name"]

        if include and not any(pat in tool_name for pat in include):
            continue

        tool_desc = d["description"]
        tool_schema = d.get("inputSchema", {})
        args_model = _build_args_schema(tool_schema)

        # Use a factory to capture loop variables
        def _make_tool(
            _name: str = tool_name,
            _desc: str = tool_desc,
            _schema: Type | None = args_model,
        ) -> Any:
            class KatzillaTool(BaseTool):  # type: ignore[misc]
                name: str = _name
                description: str = _desc
                args_schema: Any = _schema

                def _run(self, **kwargs: Any) -> str:
                    result = client.execute_tool_call(_name, kwargs)
                    return json.dumps(result.data, default=str)

            return KatzillaTool()

        tools.append(_make_tool())

    return tools
