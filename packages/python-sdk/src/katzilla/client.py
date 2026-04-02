"""Core HTTP client for the Katzilla Data API."""

from __future__ import annotations

from typing import Any

import httpx

DEFAULT_BASE_URL = "https://api.katzilla.dev"


class KatzillaApiError(Exception):
    """Raised when the Katzilla API returns a non-2xx response."""

    def __init__(self, status_code: int, body: dict[str, Any]) -> None:
        self.status_code = status_code
        self.body = body
        super().__init__(body.get("error", "Unknown API error"))


class Katzilla:
    """Katzilla Data API client.

    Usage::

        kz = Katzilla(api_key="kz_abc123")
        quakes = kz.query("hazards", "usgs-earthquakes", {"minMagnitude": 5})
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._client = httpx.Client(
            headers={"X-API-Key": api_key},
            timeout=30.0,
        )

    def __enter__(self) -> Katzilla:
        return self

    def __exit__(self, *exc: Any) -> None:
        self.close()

    def close(self) -> None:
        self._client.close()

    def query(
        self,
        agent: str,
        action: str,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Execute a data agent action.

        Args:
            agent: Agent handle (e.g. "hazards", "economic").
            action: Action ID (e.g. "usgs-earthquakes").
            params: Action input parameters.

        Returns:
            Full API response including data, quality, and citation.
        """
        handle = agent.removeprefix("katzilla-")
        url = f"{self._base_url}/agents/{handle}/actions/{action}"
        resp = self._client.post(url, json=params or {})
        body = resp.json()
        if resp.status_code >= 400:
            raise KatzillaApiError(resp.status_code, body)
        return body

    def get_tools(self) -> list[dict[str, Any]]:
        """Fetch all available tool definitions from the API."""
        resp = self._client.get(f"{self._base_url}/agents/tools")
        body = resp.json()
        if resp.status_code >= 400:
            raise KatzillaApiError(resp.status_code, body)
        return body["tools"]

    def execute_tool_call(
        self,
        tool_name: str,
        args: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Execute a tool call by its compound name (e.g. "hazards__usgs-earthquakes")."""
        sep_idx = tool_name.index("__")
        agent = tool_name[:sep_idx]
        action = tool_name[sep_idx + 2 :]
        return self.query(agent, action, args)
