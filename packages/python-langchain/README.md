# katzilla-langchain

LangChain tools for **300+ government and public data sources** via the [Katzilla](https://katzilla.dev) API. One `pip install`, instant access to FRED economics, NOAA weather, USGS earthquakes, SEC filings, FDA recalls, and hundreds more.

## Install

```bash
pip install katzilla-langchain
```

## Quick start

```python
from katzilla_langchain import KatzillaToolkit

# Initialize (get your free API key at https://katzilla.dev/dashboard)
toolkit = KatzillaToolkit(api_key="kz_xxx")
tools = toolkit.get_tools()

print(f"Loaded {len(tools)} tools")
# Loaded 312 tools
```

## Use with a LangChain agent

```python
from langchain_openai import ChatOpenAI
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate

from katzilla_langchain import KatzillaToolkit

toolkit = KatzillaToolkit(api_key="kz_xxx")
tools = toolkit.get_tools()

llm = ChatOpenAI(model="gpt-4o")
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful research assistant with access to government data sources."),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])

agent = create_tool_calling_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools)

result = executor.invoke({"input": "What is the current US unemployment rate?"})
print(result["output"])
```

## Filter tools

Load only the tools you need to keep the tool list small for the LLM:

```python
# Only economic and weather tools
toolkit = KatzillaToolkit(
    api_key="kz_xxx",
    include=["economic__", "weather__"],
)

# Everything except hazards
toolkit = KatzillaToolkit(
    api_key="kz_xxx",
    exclude=["hazards__"],
)
```

## Use a single tool directly

```python
from katzilla_langchain import KatzillaTool

tool = KatzillaTool(
    name="economic__fred-series",
    description="Fetch a FRED economic time series",
    api_key="kz_xxx",
    agent_handle="economic",
    action_id="fred-series",
)

result = tool.invoke({"seriesId": "UNRATE"})
print(result)
```

## Response format

Each tool returns a JSON string with three keys:

```json
{
  "data": { ... },
  "quality": {
    "freshness_seconds": 3600,
    "confidence": "high",
    "data_completeness": 1.0
  },
  "citation": {
    "source_name": "Federal Reserve Economic Data",
    "source_url": "https://fred.stlouisfed.org/",
    "license": "Public Domain"
  }
}
```

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `api_key` | (required) | Your Katzilla API key (`kz_xxx`) |
| `base_url` | `https://api.katzilla.dev` | API base URL override |
| `include` | `None` | List of tool name patterns to include |
| `exclude` | `None` | List of tool name patterns to exclude |

## Links

- [Katzilla docs](https://docs.katzilla.dev)
- [Get an API key](https://katzilla.dev/dashboard)
- [GitHub](https://github.com/katzilla-dev/katzilla)
