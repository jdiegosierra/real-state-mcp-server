# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Copilot, Cursor, etc.) when working with code in this repository.

## Commands

```bash
pnpm build              # TypeScript compile (tsc)
pnpm dev                # Dev server with hot reload (tsx watch)
pnpm start              # Production server (node dist/src/index.js)
pnpm lint               # ESLint
pnpm lint:fix           # ESLint with autofix
pnpm test               # Run all tests (vitest)
pnpm test:watch         # Watch mode
pnpm db:generate        # Regenerate Prisma client after schema changes
pnpm db:migrate:dev     # Create + apply migration (dev)
pnpm db:seed            # Seed database (tsx prisma/seed.ts)
```

Run a single test file: `npx vitest run __tests__/schemas.test.ts`

After changing `prisma/schema.prisma`, always run `pnpm db:generate` before `pnpm build`.

## Docker Compose

`docker compose up --build` runs the full stack: `postgres` → `migrate` (runs prisma migrate deploy, then exits) → `app` (starts the server). Migrations are automatic — never tell users to run migrations manually when using docker compose. The `migrate` service is a separate container so it can be reused as a Kubernetes Job.

## Architecture

ESM TypeScript project using pnpm. Strict mode, Node16 module resolution.

**Request flow:**
```
Express (transport.ts) → Bearer auth middleware → McpServer (server.ts) → Tool/Resource/Prompt handler → Service layer → Prisma → PostgreSQL
```

**Key design: stateless Streamable HTTP.** Each `POST /mcp` request creates a fresh `McpServer` + `StreamableHTTPServerTransport` (no sessions, no sticky sessions needed). SSE transport (`GET /sse` + `POST /messages`) is also available for backward compatibility.

### Layers

- **`src/transport.ts`** — Express app. Mounts `/mcp` (Streamable HTTP), `/sse` + `/messages` (SSE), `/health`. Applies auth middleware to MCP routes.
- **`src/server.ts`** — Factory that creates `McpServer` and registers all tools, resources, and prompts.
- **`src/tools/`** — MCP tool handlers. Each file exports a `register*Tool(server)` function. Tools use `server.registerTool()` with Zod input/output schemas and annotations. The barrel `index.ts` calls all registration functions.
- **`src/resources/`** — MCP resources. Same pattern: `register*Resource(server)`.
- **`src/prompts/`** — MCP prompts. Same pattern: `register*Prompt(server)`.
- **`src/services/`** — Business logic. `property.service.ts` (search + details), `content-generator.service.ts` (HTML generation). Tools delegate to services; services own all Prisma queries.
- **`src/schemas/`** — Zod schemas shared between tools and services. Schemas use `.strict()` to reject unknown fields.
- **`src/middleware/auth.ts`** — Bearer token auth checking `API_KEY` env var.
- **`src/config.ts`** — Zod-validated env vars. Loaded once at startup. Required: `DATABASE_URL`, `API_KEY`.

### Adding a new tool

1. Create Zod input/output schemas in `src/schemas/`
2. Create service function in `src/services/`
3. Create `src/tools/my-tool.ts` exporting `registerMyTool(server: McpServer)`
4. Add to `src/tools/index.ts` barrel
5. Add tests in `__tests__/`

Resources and prompts follow the same pattern in their respective directories.

### Testing

Tests use Vitest with `vi.mock("../src/db/client.js")` to mock Prisma. No database needed. Prisma `Decimal` fields must be mocked as objects with `valueOf()` returning a number (plain numbers cause `Number()` to return `NaN`):

```typescript
price: Object.assign(Object.create({ toString: () => "500000" }), { valueOf: () => 500000 }) as never
```

### Prisma conventions

- Model uses camelCase in TypeScript, `@@map("snake_case")` for PostgreSQL columns
- Status enum: `AVAILABLE` | `SOLD` in DB, exposed as lowercase `"available"` | `"sold"` in API via `STATUS_MAP`
- `Decimal` fields (price, lotSize) are converted with `Number()` in service layer
