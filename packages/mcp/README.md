# @katzilla/mcp

[![npm](https://img.shields.io/npm/v/@katzilla/mcp.svg)](https://www.npmjs.com/package/@katzilla/mcp)
[![license](https://img.shields.io/npm/l/@katzilla/mcp.svg)](https://github.com/codeislaw101/katzilla/blob/master/LICENSE)

Model Context Protocol server for [Katzilla](https://katzilla.dev) — 300+ free public and government data sources behind one API key, exposed as MCP tools for Claude Desktop, Cursor, and any other MCP client.

## What you get

One MCP server, one API key, and live access to primary-source data across:

- **US federal** — congress.gov, SEC EDGAR, Federal Register, Regulations.gov, USAspending, FEC, govinfo, State Department
- **US case law** — CourtListener (opinions at every level)
- **US health** — FDA recalls / adverse events / devices, NIH ClinicalTrials.gov, CMS, CDC
- **US hazards** — USGS earthquakes & water, NWS alerts, FEMA disasters, NASA FIRMS wildfires
- **Economics** — BLS, FRED, BEA, Census ACS, Treasury Fiscal Data
- **International** — 17+ open-data portals (UK, France, Germany, Canada, Australia, Brazil, Ireland, Spain, Italy, Poland, …)
- **Bodies** — Eurostat, ECB, WHO, OECD, IMF, World Bank, UN Comtrade, SIPRI
- …plus crypto, space, demographics, energy, transport, agriculture.

Every response carries a `citation` block (source, license, URL, update frequency) and a `quality` block (freshness, uptime, completeness, confidence). Results are grounded and auditable.

## Install

You don't install it directly — your MCP client runs it via `npx`.

Get a free API key at <https://katzilla.dev/dashboard>.

## Claude Desktop

Edit `claude_desktop_config.json`:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "katzilla": {
      "command": "npx",
      "args": ["-y", "@katzilla/mcp"],
      "env": {
        "KATZILLA_API_KEY": "kz_your_key_here"
      }
    }
  }
}
```

Restart Claude Desktop. You should see the Katzilla tools appear in the MCP menu.

## Cursor

Add to `~/.cursor/mcp.json` (or project-local `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "katzilla": {
      "command": "npx",
      "args": ["-y", "@katzilla/mcp"],
      "env": {
        "KATZILLA_API_KEY": "kz_your_key_here"
      }
    }
  }
}
```

## Windsurf / Continue / other MCP clients

The server speaks stdio. Point your client at `npx -y @katzilla/mcp` and set `KATZILLA_API_KEY` in the environment.

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `KATZILLA_API_KEY` | yes | — | Your key (starts with `kz_`) |
| `KATZILLA_BASE_URL` | no | `https://api.katzilla.dev` | Override for self-hosted / staging |

## How it works

On start, the server calls Katzilla's public `/agents/tools` endpoint and registers every available action as an MCP tool. Tool calls proxy through to the Katzilla API with your key, and return the full `{ data, quality, citation }` payload as JSON text content so the model can reason over source metadata.

## Links

- Katzilla API — <https://katzilla.dev>
- API key & dashboard — <https://katzilla.dev/dashboard>
- Main repository — <https://github.com/codeislaw101/katzilla>
- Issues — <https://github.com/codeislaw101/katzilla/issues>

## License

MIT
