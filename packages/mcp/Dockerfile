# @katzilla/mcp — Glama container build
#
# Standalone MCP stdio server for Katzilla. Glama builds this image to run
# introspection (tools/list) against the server for its quality + security
# scoring. The root Dockerfile is for the Railway API service and is too
# heavy (Playwright base, full monorepo) for Glama — this image builds
# only the MCP package and its @katzilla/sdk workspace dep.
#
# Build context: repository root.
#   docker build -f packages/mcp/Dockerfile -t katzilla-mcp .
#
# Real users supply KATZILLA_API_KEY at runtime. The placeholder below is
# only so the process doesn't exit during Glama's introspection — the
# startup call to /agents/tools is a public endpoint and doesn't check keys.

FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copy workspace manifests first so pnpm can resolve the dep graph
# without pulling in the whole repo.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/mcp/package.json packages/mcp/package.json
COPY packages/sdk/package.json packages/sdk/package.json

# Install only @katzilla/mcp + its transitive deps (incl. @katzilla/sdk).
RUN pnpm install --frozen-lockfile --filter @katzilla/mcp...

# Copy source for the two packages we build.
COPY packages/sdk packages/sdk
COPY packages/mcp packages/mcp

# Build sdk first so mcp's tsc can resolve @katzilla/sdk types.
RUN pnpm --filter @katzilla/sdk build \
 && pnpm --filter @katzilla/mcp build

# ── Runtime image ──────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

COPY --from=build /app /app

ENV NODE_ENV=production \
    KATZILLA_API_KEY=kz_placeholder_for_glama_introspection

# stdio transport — no port exposed.
CMD ["node", "packages/mcp/dist/index.js"]
