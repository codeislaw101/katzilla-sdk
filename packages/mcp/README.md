# @katzilla/mcp

[![npm](https://img.shields.io/npm/v/@katzilla/mcp.svg)](https://www.npmjs.com/package/@katzilla/mcp)
[![license](https://img.shields.io/npm/l/@katzilla/mcp.svg)](https://github.com/codeislaw101/katzilla-sdk/blob/master/LICENSE)

Model Context Protocol server for [Katzilla](https://katzilla.dev) — every major US government source plus 15+ international open-data portals behind one API key, exposed as MCP tools for Claude Desktop, Cursor, and any other MCP client.

## What you get

One MCP server, one API key, and live access to primary-source government data across:

- **US federal** — Congress.gov, SEC EDGAR, Federal Register, Regulations.gov, USAspending, FEC, GovInfo, State Department
- **US case law** — CourtListener (opinions at every level)
- **US health** — FDA recalls / adverse events / devices, NIH ClinicalTrials.gov, CMS, CDC, NPPES NPI
- **US hazards** — USGS earthquakes & water, NWS alerts, FEMA disasters, NASA FIRMS wildfires
- **US economics** — BLS, FRED, BEA, Census ACS, Treasury Fiscal Data
- **International bodies** — Eurostat, ECB, WHO, OECD, IMF, World Bank, UN Comtrade, SIPRI, WTO
- **National open-data portals** — UK, France, Germany, Italy, Netherlands, Australia, Canada, Brazil, Ireland, Spain, Poland, Finland, Portugal, plus city portals (Istanbul, Gdansk, Lviv, Queensland)
- …plus agencies for agriculture (USDA), energy (EIA, NREL), consumer protection (CFPB, FTC, CPSC), patents (USPTO), transport (NHTSA, BTS), and more.

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

- Katzilla — <https://katzilla.dev>
- API key & dashboard — <https://katzilla.dev/dashboard>
- API docs — <https://katzilla.dev/docs>
- SDK + MCP repository — <https://github.com/codeislaw101/katzilla-sdk>
- Issues — <https://github.com/codeislaw101/katzilla-sdk/issues>

## License

MIT
