# Katzilla SDK & MCP

Official client libraries and Model Context Protocol server for [Katzilla](https://katzilla.dev) — the government-data backbone for AI agents.

One API key. Every major US federal agency (SEC, FDA, NOAA, USGS, Census, Congress, FRED, BLS, FEMA, EPA, CDC, NIH, USPTO, and more), plus 15+ international open-data portals and primary-source institutions (World Bank, IMF, OECD, WHO, Eurostat, ECB, CourtListener). Every response carries a `citation` block with source URL and license, plus a `quality` block with freshness and confidence scores.

This repo contains the **client-side pieces** (SDKs and MCP server). The API backend is a separate private project.

## Packages

| Package | Registry | Purpose |
| --- | --- | --- |
| [`@katzilla/sdk`](./packages/sdk) | [npm](https://www.npmjs.com/package/@katzilla/sdk) | TypeScript / JavaScript client |
| [`@katzilla/mcp`](./packages/mcp) | [npm](https://www.npmjs.com/package/@katzilla/mcp) | Model Context Protocol server for Claude Desktop, Cursor, Windsurf, etc. |
| [`@katzilla/ai-sdk`](./packages/ai-sdk) | [npm](https://www.npmjs.com/package/@katzilla/ai-sdk) | Adapter for [Vercel AI SDK](https://sdk.vercel.ai) `tools` |
| [`katzilla`](./packages/python-sdk) (Python) | [PyPI](https://pypi.org/project/katzilla/) | Python client |
| [`katzilla-langchain`](./packages/python-langchain) (Python) | [PyPI](https://pypi.org/project/katzilla-langchain/) | LangChain tools adapter |

## Quick start

Get a free API key at [katzilla.dev](https://katzilla.dev). Then pick the integration you want:

### TypeScript / JavaScript

```bash
npm install @katzilla/sdk
```

```ts
import { Katzilla } from "@katzilla/sdk";

const kz = new Katzilla({ apiKey: process.env.KATZILLA_API_KEY! });

// Agent actions
const { data, citation } = await kz.query("hazards", "usgs-earthquakes", {
  minMagnitude: 5,
  limit: 10,
});

// Unified datasets API (v2) — search 526K data.gov datasets + on-demand parse
const hits = await kz.datasets.search({ q: "FDA recalls", limit: 10 });

// Already-structured datasets stream rows immediately:
const rows = await kz.datasets.getParsed(hits.results[0].id);

// For `raw_only` datasets (PDFs, shapefiles), request a Claude parse
// — meters pages against your plan; check estimated_pages first:
if (hits.results[0].retrieval.parse.available) {
  const preview = await kz.datasets.getParsed(hits.results[0].id, { parse: true });
  console.log(preview.text, preview.structured);
}

// Track your monthly page budget
const usage = await kz.usage.pages();
console.log(`${usage.pages_consumed} / ${usage.included_pages} pages this period`);
```

### Claude Desktop / Cursor / MCP clients

Edit your MCP client's config file (`claude_desktop_config.json` or `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "katzilla": {
      "command": "npx",
      "args": ["-y", "@katzilla/mcp"],
      "env": { "KATZILLA_API_KEY": "kz_your_key_here" }
    }
  }
}
```

Restart the client. Every Katzilla action shows up as an MCP tool.

Full setup per client lives in [`packages/mcp/README.md`](./packages/mcp/README.md).

### Vercel AI SDK

```bash
npm install @katzilla/ai-sdk @katzilla/sdk ai zod
```

```ts
import { generateText } from "ai";
import { katzillaTools } from "@katzilla/ai-sdk";

const { text } = await generateText({
  model: yourModel,
  tools: katzillaTools({ apiKey: process.env.KATZILLA_API_KEY! }),
  prompt: "What were the largest earthquakes this week?",
});
```

### Python

```bash
pip install katzilla
```

```python
from katzilla import Katzilla

kz = Katzilla(api_key="kz_...")
resp = kz.query("hazards", "usgs-earthquakes", min_magnitude=5)
print(resp["data"], resp["citation"])
```

### LangChain

```bash
pip install katzilla-langchain
```

```python
from katzilla_langchain import get_katzilla_tools

tools = get_katzilla_tools(api_key="kz_...")
# Pass `tools` to any LangChain agent.
```

## Developing locally

```bash
git clone https://github.com/codeislaw101/katzilla-sdk.git
cd katzilla-sdk
pnpm install
pnpm build
pnpm typecheck
```

Each TS package uses `tsc` for build. `@katzilla/mcp` and `@katzilla/ai-sdk` depend on `@katzilla/sdk` via `workspace:*` so local changes propagate immediately during `pnpm dev`.

## Contributing

Issues and PRs welcome. For backend bugs (action behavior, data quality, rate limits) file against this repo and we'll route internally.

## License

MIT. See [LICENSE](./LICENSE).

## Links

- Katzilla homepage — <https://katzilla.dev>
- API docs — <https://katzilla.dev/docs>
- Get an API key — <https://katzilla.dev/dashboard>
