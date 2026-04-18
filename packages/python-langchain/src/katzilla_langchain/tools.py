"""LangChain tool and toolkit for the Katzilla Data API.

Usage::

    from katzilla_langchain import KatzillaToolkit

    toolkit = KatzillaToolkit(api_key="kz_xxx")
    tools = toolkit.get_tools()

    # Use with any LangChain agent
    from langchain.agents import create_tool_calling_agent, AgentExecutor
    agent = create_tool_calling_agent(llm, tools, prompt)
    executor = AgentExecutor(agent=agent, tools=tools)
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any, Dict, List, Optional, Type

import requests
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field, create_model

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://api.katzilla.dev"
MAX_RETRIES = 3
RETRY_BACKOFF = 0.5


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------


class KatzillaApiError(Exception):
    """Raised when the Katzilla API returns a non-2xx response."""

    def __init__(self, status_code: int, body: dict) -> None:
        self.status_code = status_code
        self.body = body
        super().__init__(body.get("error", f"HTTP {status_code}"))


def _request_with_retry(
    session: requests.Session,
    method: str,
    url: str,
    retries: int = MAX_RETRIES,
    **kwargs: Any,
) -> requests.Response:
    """HTTP request with exponential-backoff retry on 5xx / network errors."""
    last_exc: Exception | None = None
    for attempt in range(retries):
        try:
            resp = session.request(method, url, **kwargs)
            if resp.status_code < 500:
                return resp
            last_exc = KatzillaApiError(resp.status_code, resp.json())
        except requests.ConnectionError as exc:
            last_exc = exc
        if attempt < retries - 1:
            time.sleep(RETRY_BACKOFF * (2**attempt))
    raise last_exc  # type: ignore[misc]


# ---------------------------------------------------------------------------
# JSON Schema -> Pydantic model conversion
# ---------------------------------------------------------------------------

_JSON_TYPE_MAP: dict[str, type] = {
    "string": str,
    "integer": int,
    "number": float,
    "boolean": bool,
    "array": list,
    "object": dict,
}


def _json_schema_to_pydantic_field(
    name: str,
    prop: dict[str, Any],
    required: bool,
) -> tuple[Any, Any]:
    """Convert a single JSON Schema property to a ``(annotation, Field)`` pair."""
    base_type = _JSON_TYPE_MAP.get(prop.get("type", "string"), str)
    description = prop.get("description", "")
    default = prop.get("default", ...)

    if not required and default is ...:
        return (Optional[base_type], Field(default=None, description=description))
    return (base_type, Field(default=default, description=description))


def _build_args_model(
    tool_name: str,
    input_schema: dict[str, Any],
) -> Optional[Type[BaseModel]]:
    """Build a Pydantic v2 model from a JSON Schema ``inputSchema``."""
    properties = input_schema.get("properties", {})
    if not properties:
        return None

    required_set = set(input_schema.get("required", []))
    fields: dict[str, Any] = {}
    for prop_name, prop_schema in properties.items():
        fields[prop_name] = _json_schema_to_pydantic_field(
            prop_name, prop_schema, prop_name in required_set
        )

    # Create a unique model name from the tool name (e.g. "economic__fred_series_Input")
    safe_name = tool_name.replace("/", "_").replace("-", "_") + "_Input"
    return create_model(safe_name, **fields)  # type: ignore[call-overload]


# ---------------------------------------------------------------------------
# KatzillaTool
# ---------------------------------------------------------------------------


class KatzillaTool(BaseTool):
    """A LangChain tool backed by a single Katzilla data-source action.

    You rarely create these directly -- use :class:`KatzillaToolkit` instead.
    """

    # Katzilla-specific metadata (not part of the BaseTool protocol)
    api_base_url: str = DEFAULT_BASE_URL
    api_key: str = ""
    agent_handle: str = ""
    action_id: str = ""

    def _run(self, **kwargs: Any) -> str:
        """Execute the Katzilla action and return a JSON string."""
        session = requests.Session()
        session.headers.update(
            {
                "Content-Type": "application/json",
                "X-API-Key": self.api_key,
                "User-Agent": "katzilla-langchain/0.1.0",
            }
        )

        url = f"{self.api_base_url}/agents/{self.agent_handle}/actions/{self.action_id}"

        try:
            resp = _request_with_retry(session, "POST", url, json=kwargs)
            body = resp.json()

            if resp.status_code >= 400:
                error_msg = body.get("error", f"HTTP {resp.status_code}")
                details = body.get("details", [])
                hint = body.get("hint", "")
                parts = [f"Error: {error_msg}"]
                if details:
                    parts.append(f"Details: {json.dumps(details)}")
                if hint:
                    parts.append(f"Hint: {hint}")
                return "\n".join(parts)

            # Return structured result with data + metadata
            result = {
                "data": body.get("data"),
                "quality": body.get("quality"),
                "citation": body.get("citation"),
            }
            return json.dumps(result, default=str)

        except KatzillaApiError as exc:
            return f"Error: {exc}"
        except requests.RequestException as exc:
            return f"Request failed: {exc}"
        finally:
            session.close()


# ---------------------------------------------------------------------------
# KatzillaToolkit
# ---------------------------------------------------------------------------


class KatzillaToolkit:
    """Fetches tool definitions from the Katzilla API and returns LangChain tools.

    Args:
        api_key: Your Katzilla API key (starts with ``kz_``).
        base_url: Override the default API base URL.
        include: Optional list of name patterns to include (e.g.
            ``["economic__", "weather__"]``). If *None*, all tools are returned.
        exclude: Optional list of name patterns to exclude.

    Usage::

        from katzilla_langchain import KatzillaToolkit

        toolkit = KatzillaToolkit(api_key="kz_xxx")
        tools = toolkit.get_tools()

        # Use with LangChain agent
        from langchain.agents import create_tool_calling_agent, AgentExecutor
        agent = create_tool_calling_agent(llm, tools, prompt)
        executor = AgentExecutor(agent=agent, tools=tools)
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        include: list[str] | None = None,
        exclude: list[str] | None = None,
    ) -> None:
        if not api_key:
            raise ValueError("api_key is required (get one at https://katzilla.dev/dashboard)")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.include = include
        self.exclude = exclude

    # -- public API ---------------------------------------------------------

    def get_tools(self) -> List[KatzillaTool]:
        """Fetch tool definitions from the API and return LangChain tools.

        Returns:
            A list of :class:`KatzillaTool` instances, one per data source.
        """
        raw_defs = self._fetch_tool_definitions()
        tools: list[KatzillaTool] = []

        for defn in raw_defs:
            name: str = defn["name"]

            # Filtering
            if self.include and not any(p in name for p in self.include):
                continue
            if self.exclude and any(p in name for p in self.exclude):
                continue

            # Parse agent__action compound name
            sep = name.find("__")
            if sep == -1:
                logger.warning("Skipping tool with unexpected name format: %s", name)
                continue
            agent_handle = name[:sep]
            action_id = name[sep + 2 :]

            description = defn.get("description", f"Katzilla: {name}")
            input_schema = defn.get("inputSchema", {})
            args_model = _build_args_model(name, input_schema)

            tool = KatzillaTool(
                name=name,
                description=description,
                api_base_url=self.base_url,
                api_key=self.api_key,
                agent_handle=agent_handle,
                action_id=action_id,
            )
            if args_model is not None:
                tool.args_schema = args_model  # type: ignore[assignment]

            tools.append(tool)

        logger.info("Loaded %d Katzilla tools", len(tools))
        return tools

    # -- internals ----------------------------------------------------------

    def _fetch_tool_definitions(self) -> list[dict[str, Any]]:
        """GET /agents/tools and return the raw tool definition list."""
        session = requests.Session()
        session.headers.update(
            {
                "X-API-Key": self.api_key,
                "User-Agent": "katzilla-langchain/0.1.0",
            }
        )
        try:
            resp = _request_with_retry(
                session, "GET", f"{self.base_url}/agents/tools"
            )
            body = resp.json()
            if resp.status_code >= 400:
                raise KatzillaApiError(resp.status_code, body)
            return body.get("tools", [])
        finally:
            session.close()
