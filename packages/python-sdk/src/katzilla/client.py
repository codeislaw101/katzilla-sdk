"""Core HTTP client for the Katzilla Data API."""

from __future__ import annotations

import time
from typing import Any

import httpx

DEFAULT_BASE_URL = "https://api.katzilla.dev"
MAX_RETRIES = 3
RETRY_BACKOFF = 0.5  # seconds, doubled each retry


class KatzillaApiError(Exception):
    """Raised when the Katzilla API returns a non-2xx response."""

    def __init__(self, status_code: int, body: dict[str, Any]) -> None:
        self.status_code = status_code
        self.body = body
        self.request_id = body.get("request_id")
        super().__init__(body.get("error", "Unknown API error"))


class KatzillaResponse:
    """Structured API response with data, quality, and citation access."""

    def __init__(self, raw: dict[str, Any]) -> None:
        self._raw = raw

    @property
    def data(self) -> Any:
        return self._raw.get("data")

    @property
    def text(self) -> str | None:
        return self._raw.get("text")

    @property
    def meta(self) -> dict[str, Any]:
        return self._raw.get("meta", {})

    @property
    def quality(self) -> dict[str, Any]:
        return self._raw.get("quality", {})

    @property
    def citation(self) -> dict[str, Any] | None:
        return self._raw.get("citation")

    @property
    def cache_status(self) -> str:
        return self.meta.get("cacheStatus", "unknown")

    @property
    def duration_ms(self) -> int:
        return self.meta.get("durationMs", 0)

    @property
    def raw(self) -> dict[str, Any]:
        return self._raw

    def __repr__(self) -> str:
        agent = self.meta.get("agent", "?")
        action = self.meta.get("action", "?")
        return f"<KatzillaResponse {agent}/{action} cache={self.cache_status}>"


class Katzilla:
    """Katzilla Data API client.

    Usage::

        kz = Katzilla(api_key="kz_abc123")
        result = kz.query("hazards", "usgs-earthquakes", {"minMagnitude": 5})
        print(result.data)

    Context manager::

        with Katzilla(api_key="kz_abc123") as kz:
            result = kz.query("hazards", "usgs-earthquakes")
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 30.0,
        retries: int = MAX_RETRIES,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._retries = retries
        self._client = httpx.Client(
            headers={"X-API-Key": api_key, "User-Agent": "katzilla-python/0.1.0"},
            timeout=timeout,
        )

    def __enter__(self) -> Katzilla:
        return self

    def __exit__(self, *exc: Any) -> None:
        self.close()

    def close(self) -> None:
        self._client.close()

    def _request_with_retry(
        self,
        method: str,
        url: str,
        **kwargs: Any,
    ) -> httpx.Response:
        """Make an HTTP request with exponential backoff retry on 5xx/network errors."""
        last_exc: Exception | None = None
        for attempt in range(self._retries):
            try:
                resp = self._client.request(method, url, **kwargs)
                if resp.status_code < 500:
                    return resp
                last_exc = KatzillaApiError(resp.status_code, resp.json())
            except httpx.TransportError as e:
                last_exc = e
            if attempt < self._retries - 1:
                time.sleep(RETRY_BACKOFF * (2 ** attempt))
        raise last_exc  # type: ignore[misc]

    def query(
        self,
        agent: str,
        action: str,
        params: dict[str, Any] | None = None,
        *,
        fields: list[str] | None = None,
        format: str | None = None,
        limit: int | None = None,
        mock: bool = False,
    ) -> KatzillaResponse:
        """Execute a data agent action.

        Args:
            agent: Agent handle (e.g. "hazards", "economic").
            action: Action ID (e.g. "usgs-earthquakes").
            params: Action input parameters.
            fields: Filter response to only these fields (_fields).
            format: Response format - "full" or "compact" (_format).
            limit: Limit array results (_limit).
            mock: Return cached sample data instead of hitting upstream (_mock).

        Returns:
            KatzillaResponse with data, quality, and citation.
        """
        handle = agent.removeprefix("katzilla-")
        url = f"{self._base_url}/agents/{handle}/actions/{action}"

        body: dict[str, Any] = dict(params or {})
        if fields:
            body["_fields"] = fields
        if format:
            body["_format"] = format
        if limit:
            body["_limit"] = limit
        if mock:
            body["_mock"] = True

        resp = self._request_with_retry("POST", url, json=body)
        data = resp.json()
        if resp.status_code >= 400:
            raise KatzillaApiError(resp.status_code, data)
        return KatzillaResponse(data)

    def get_tools(self) -> list[dict[str, Any]]:
        """Fetch all available tool definitions from the API."""
        resp = self._request_with_retry("GET", f"{self._base_url}/agents/tools")
        body = resp.json()
        if resp.status_code >= 400:
            raise KatzillaApiError(resp.status_code, body)
        return body["tools"]

    def execute_tool_call(
        self,
        tool_name: str,
        args: dict[str, Any] | None = None,
    ) -> KatzillaResponse:
        """Execute a tool call by its compound name (e.g. "hazards__usgs-earthquakes")."""
        sep_idx = tool_name.index("__")
        agent = tool_name[:sep_idx]
        action = tool_name[sep_idx + 2:]
        return self.query(agent, action, args)

    def list_agents(self) -> list[dict[str, Any]]:
        """List all available data agents."""
        resp = self._request_with_retry("GET", f"{self._base_url}/agents")
        body = resp.json()
        if resp.status_code >= 400:
            raise KatzillaApiError(resp.status_code, body)
        return body

    def status(self) -> dict[str, Any]:
        """Get the current status of all data sources."""
        resp = self._request_with_retry("GET", f"{self._base_url}/status")
        body = resp.json()
        if resp.status_code >= 400:
            raise KatzillaApiError(resp.status_code, body)
        return body

    # ── Support Tickets ──────────────────────────────────────

    def create_ticket(
        self,
        subject: str,
        description: str,
        category: str | None = None,
        priority: str | None = None,
    ) -> dict[str, Any]:
        """Create a support ticket.

        Args:
            subject: Ticket subject line.
            description: Detailed description of the issue.
            category: One of: general, billing, bug, feature, api, account.
            priority: One of: low, normal, high, urgent.
        """
        body: dict[str, Any] = {
            "subject": subject,
            "description": f"{description}\n\n---\n_Filed via Katzilla Python SDK_",
        }
        if category:
            body["category"] = category
        if priority:
            body["priority"] = priority
        resp = self._request_with_retry("POST", f"{self._base_url}/support/tickets", json=body)
        data = resp.json()
        if resp.status_code >= 400:
            raise KatzillaApiError(resp.status_code, data)
        return data

    def list_tickets(self, status: str | None = None) -> list[dict[str, Any]]:
        """List your support tickets."""
        params: dict[str, str] = {}
        if status:
            params["status"] = status
        resp = self._request_with_retry("GET", f"{self._base_url}/support/tickets", params=params)
        data = resp.json()
        if resp.status_code >= 400:
            raise KatzillaApiError(resp.status_code, data)
        return data.get("tickets", [])

    def get_ticket(self, ticket_id: str) -> dict[str, Any]:
        """Get a single ticket with its full conversation."""
        resp = self._request_with_retry("GET", f"{self._base_url}/support/tickets/{ticket_id}")
        data = resp.json()
        if resp.status_code >= 400:
            raise KatzillaApiError(resp.status_code, data)
        return data

    def reply_to_ticket(self, ticket_id: str, body: str) -> dict[str, Any]:
        """Reply to a support ticket."""
        resp = self._request_with_retry(
            "POST", f"{self._base_url}/support/tickets/{ticket_id}/replies", json={"body": body}
        )
        data = resp.json()
        if resp.status_code >= 400:
            raise KatzillaApiError(resp.status_code, data)
        return data

    def join(
        self,
        sources: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Execute a multi-source join query.

        Args:
            sources: List of source dicts with agent, actionId, alias, params keys.

        Returns:
            Combined results keyed by alias.
        """
        resp = self._request_with_retry(
            "POST",
            f"{self._base_url}/v1/join",
            json={"sources": sources},
        )
        body = resp.json()
        if resp.status_code >= 400:
            raise KatzillaApiError(resp.status_code, body)
        return body


class AsyncKatzilla:
    """Async version of the Katzilla client using httpx.AsyncClient.

    Usage::

        async with AsyncKatzilla(api_key="kz_abc123") as kz:
            result = await kz.query("hazards", "usgs-earthquakes")
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 30.0,
        retries: int = MAX_RETRIES,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._retries = retries
        self._client = httpx.AsyncClient(
            headers={"X-API-Key": api_key, "User-Agent": "katzilla-python/0.1.0"},
            timeout=timeout,
        )

    async def __aenter__(self) -> AsyncKatzilla:
        return self

    async def __aexit__(self, *exc: Any) -> None:
        await self.close()

    async def close(self) -> None:
        await self._client.aclose()

    async def _request_with_retry(
        self,
        method: str,
        url: str,
        **kwargs: Any,
    ) -> httpx.Response:
        import asyncio

        last_exc: Exception | None = None
        for attempt in range(self._retries):
            try:
                resp = await self._client.request(method, url, **kwargs)
                if resp.status_code < 500:
                    return resp
                last_exc = KatzillaApiError(resp.status_code, resp.json())
            except httpx.TransportError as e:
                last_exc = e
            if attempt < self._retries - 1:
                await asyncio.sleep(RETRY_BACKOFF * (2 ** attempt))
        raise last_exc  # type: ignore[misc]

    async def query(
        self,
        agent: str,
        action: str,
        params: dict[str, Any] | None = None,
        *,
        fields: list[str] | None = None,
        format: str | None = None,
        limit: int | None = None,
        mock: bool = False,
    ) -> KatzillaResponse:
        """Execute a data agent action (async)."""
        handle = agent.removeprefix("katzilla-")
        url = f"{self._base_url}/agents/{handle}/actions/{action}"

        body: dict[str, Any] = dict(params or {})
        if fields:
            body["_fields"] = fields
        if format:
            body["_format"] = format
        if limit:
            body["_limit"] = limit
        if mock:
            body["_mock"] = True

        resp = await self._request_with_retry("POST", url, json=body)
        data = resp.json()
        if resp.status_code >= 400:
            raise KatzillaApiError(resp.status_code, data)
        return KatzillaResponse(data)

    async def get_tools(self) -> list[dict[str, Any]]:
        """Fetch all available tool definitions (async)."""
        resp = await self._request_with_retry("GET", f"{self._base_url}/agents/tools")
        body = resp.json()
        if resp.status_code >= 400:
            raise KatzillaApiError(resp.status_code, body)
        return body["tools"]

    async def execute_tool_call(
        self,
        tool_name: str,
        args: dict[str, Any] | None = None,
    ) -> KatzillaResponse:
        """Execute a tool call by compound name (async)."""
        sep_idx = tool_name.index("__")
        agent = tool_name[:sep_idx]
        action = tool_name[sep_idx + 2:]
        return await self.query(agent, action, args)

    # ── Support Tickets (async) ─────────────────────────────

    async def create_ticket(
        self, subject: str, description: str, category: str | None = None, priority: str | None = None
    ) -> dict[str, Any]:
        """Create a support ticket (async)."""
        body: dict[str, Any] = {"subject": subject, "description": f"{description}\n\n---\n_Filed via Katzilla Python SDK_"}
        if category: body["category"] = category
        if priority: body["priority"] = priority
        resp = await self._request_with_retry("POST", f"{self._base_url}/support/tickets", json=body)
        data = resp.json()
        if resp.status_code >= 400: raise KatzillaApiError(resp.status_code, data)
        return data

    async def list_tickets(self, status: str | None = None) -> list[dict[str, Any]]:
        """List your support tickets (async)."""
        params: dict[str, str] = {}
        if status: params["status"] = status
        resp = await self._request_with_retry("GET", f"{self._base_url}/support/tickets", params=params)
        data = resp.json()
        if resp.status_code >= 400: raise KatzillaApiError(resp.status_code, data)
        return data.get("tickets", [])

    async def get_ticket(self, ticket_id: str) -> dict[str, Any]:
        """Get a single ticket with conversation (async)."""
        resp = await self._request_with_retry("GET", f"{self._base_url}/support/tickets/{ticket_id}")
        data = resp.json()
        if resp.status_code >= 400: raise KatzillaApiError(resp.status_code, data)
        return data

    async def reply_to_ticket(self, ticket_id: str, body: str) -> dict[str, Any]:
        """Reply to a support ticket (async)."""
        resp = await self._request_with_retry("POST", f"{self._base_url}/support/tickets/{ticket_id}/replies", json={"body": body})
        data = resp.json()
        if resp.status_code >= 400: raise KatzillaApiError(resp.status_code, data)
        return data

    async def join(
        self,
        sources: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Execute a multi-source join query (async)."""
        resp = await self._request_with_retry(
            "POST",
            f"{self._base_url}/v1/join",
            json={"sources": sources},
        )
        body = resp.json()
        if resp.status_code >= 400:
            raise KatzillaApiError(resp.status_code, body)
        return body
