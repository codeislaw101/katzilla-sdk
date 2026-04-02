"""Katzilla — Official Python SDK for the Katzilla Data API."""

from .client import Katzilla, KatzillaApiError
from .openai_tools import as_openai_tools

# OpenClaw uses the same OpenAI function calling format
as_openclaw_tools = as_openai_tools

__all__ = [
    "Katzilla",
    "KatzillaApiError",
    "as_openai_tools",
    "as_openclaw_tools",
]
