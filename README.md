# Real Estate MCP Server

An MCP (Model Context Protocol) server for real estate data, built with TypeScript, Express, Prisma, and PostgreSQL. Exposes tools for searching properties, retrieving details, and generating SEO-optimized listing content.

## Tools

| Tool | Description |
|---|---|
| `search_properties` | Find properties by city, price range, and status. Returns summary list. |
| `get_property_details` | Full technical details for a property by ID (features, notes, etc.). |
| `generate_listing_content` | Generates SEO HTML (`<title>`, `<meta>`, `<article>`) for a property. |

## Resource

| URI | Description |
|---|---|
| `realestate://listings/today` | Daily digest of new properties added today. Returns JSON with all properties created since midnight. |

The resource is readable by any MCP client. In the Inspector, switch to the **Resources** tab to browse and read it.

## Prompt

| Prompt | Description |
|---|---|
| `marketing-email` | Generates a prompt that helps write a marketing email about a specific property. Takes a `property_id` argument. |

The prompt pre-fills a detailed request with the property's price, location, features, and specs, asking the AI to write a compelling email with subject line, key selling points, and call to action. Test it in the Inspector's **Prompts** tab.

### Example Interaction (Mental Model)

A user asks an AI assistant:

> "Find me an apartment in Lisbon under 700k and generate a listing description for it."

The AI makes two sequential tool calls:

**1. Search for matching properties:**

```json
// Tool: search_properties
{ "city": "Lisbon", "max_price": 700000 }

// Result:
{
  "total": 1,
  "properties": [
    { "id": "prop_123", "title": "T3 in Lisbon", "city": "Lisbon", "price": 425000, ... }
  ]
}
```

**2. Generate content using the returned ID:**

```json
// Tool: generate_listing_content
{ "property_id": "prop_123", "target_language": "en" }

// Result:
{
  "property_id": "prop_123",
  "language": "en",
  "html": "<title>T3 in Lisbon | $425,000 | Lisbon, PT</title><meta ...>..."
}
```

The `search_properties` response includes `id` fields that chain directly into `get_property_details` and `generate_listing_content`. This is the intended multi-step workflow.

## Quick Start

```bash
# 1. Clone and install
pnpm install

# 2. Start PostgreSQL
docker compose up -d postgres

# 3. Configure environment
cp .env.example .env
# Edit .env — set API_KEY to any secret string

# 4. Apply schema and seed data
pnpm db:migrate:dev --name init
pnpm db:seed

# 5. Run
pnpm dev
```

The server starts at `http://localhost:3000`.

```bash
# Health check (no auth required)
curl http://localhost:3000/health

# MCP initialize (requires Bearer token)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-api-key-here" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

### Running the Full Stack with Docker

To run everything (PostgreSQL + migrations + app) in a single command:

```bash
docker compose up --build
```

Docker Compose runs three services in order: `postgres` (waits for healthy) → `migrate` (applies schema and exits) → `app` (starts the server on port 3000). Migrations are handled automatically — no manual step needed.

To seed sample data after the stack is up:

```bash
docker compose exec app pnpm db:seed
```

### Live Demo

A live instance is deployed on AWS (EC2, `eu-west-1`) and pre-seeded with sample data. You can test it immediately without any local setup.

> **Note:** This instance uses an ephemeral public IP. If the IP below is unreachable, the instance may have been restarted or terminated. In that case, use the [local Docker Compose setup](#testing-with-modelcontextprotocolinspector-local) instead.

| Endpoint | URL |
|---|---|
| Health check | `http://34.244.7.83:3000/health` |
| Streamable HTTP | `http://34.244.7.83:3000/mcp` |
| SSE (legacy) | `http://34.244.7.83:3000/sse` |

**API Key:** `change-me-in-production`

**Quick test with curl:**

```bash
# Health check (no auth)
curl http://34.244.7.83:3000/health

# MCP initialize
curl -X POST http://34.244.7.83:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer change-me-in-production" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

**Test with MCP Inspector:**

```bash
npx @modelcontextprotocol/inspector
```

In the Inspector UI:
- **URL**: `http://34.244.7.83:3000/mcp`
- **Transport Type**: Streamable HTTP
- **Headers**: `Authorization: Bearer change-me-in-production`

### Testing with `@modelcontextprotocol/inspector` (local)

To run the full stack locally instead of using the live demo:

**1. Start the full stack:**

```bash
docker compose up --build
docker compose exec app pnpm db:seed   # first time only
```

**2. Launch the Inspector** in a separate terminal:

```bash
npx @modelcontextprotocol/inspector
```

**3. Configure the connection** in the Inspector UI:

- **Transport Type**: Select `SSE` or `Streamable HTTP`
- **URL**: `http://localhost:3000/sse` (SSE) or `http://localhost:3000/mcp` (Streamable HTTP)
- **Headers**: Add `Authorization: Bearer change-me-in-production` (or your custom `API_KEY` if changed)

**4. Connect** and explore:

- The **Tools** tab lists all three tools with their schemas
- Click any tool to see its input schema, fill in parameters, and execute
- Example: select `search_properties`, enter `{"city": "Austin"}`, and click **Run** to see results
- Copy an `id` from the result, then test `get_property_details` with that ID
- Finally, test `generate_listing_content` with the same ID to see the HTML output

**5. Verify the full chain** (the mental model):

```
search_properties → get id from result → get_property_details or generate_listing_content
```

This end-to-end flow validates that the server handles the intended multi-step AI workflow correctly.

## Architecture

```
Transport (Express + Auth) → McpServer (protocol) → Tools (Zod schemas) → Services (logic) → DB (Prisma)
```

```
src/
├── index.ts              # Entry point + graceful shutdown
├── server.ts             # McpServer factory + tool registration
├── transport.ts          # Express: /mcp, /sse, /messages, /health
├── config.ts             # Env validation (Zod)
├── logger.ts             # pino structured logging
├── constants.ts          # CHARACTER_LIMIT, defaults
├── middleware/
│   └── auth.ts           # Bearer token authentication
├── db/
│   └── client.ts         # Prisma singleton
├── tools/
│   ├── index.ts          # registerAllTools() barrel
│   ├── search-properties.ts
│   ├── get-property-details.ts
│   └── generate-listing-content.ts
├── resources/
│   ├── index.ts          # registerAllResources() barrel
│   └── today-listings.ts # Resource: realestate://listings/today
├── prompts/
│   ├── index.ts          # registerAllPrompts() barrel
│   └── marketing-email.ts # Prompt: marketing-email
├── services/
│   ├── property.service.ts           # PropertyService: search + details
│   └── content-generator.service.ts  # ContentGeneratorService: HTML generation
└── schemas/
    └── property.schemas.ts           # Zod input/output schemas
```

### Separation of Concerns

The codebase follows a strict layered architecture:

- **Tools** (`src/tools/`) — MCP protocol layer. Register tools with Zod schemas, delegate to services. No business logic here.
- **Services** (`src/services/`) — Business logic layer. `PropertyService` handles database queries. `ContentGeneratorService` handles HTML generation. These are fully decoupled — the content generator could be replaced with an actual LLM API call without touching any other layer.
- **Database** (`src/db/`) — Prisma singleton. Services import the client; tools never touch the database directly.

The "LLM integration" (content generation) is architecturally separated from database access. `ContentGeneratorService` fetches property data through Prisma and generates HTML independently. Swapping the mocked generation for a real LLM API call (e.g., Claude, GPT) would require changes only in `content-generator.service.ts`.

## Authentication

All MCP endpoints (`/mcp`, `/sse`, `/messages`) require a Bearer token via the `Authorization` header:

```
Authorization: Bearer <API_KEY>
```

The `API_KEY` is set via environment variable. Requests without a valid token receive HTTP 401 with a JSON-RPC error:

```json
{
  "jsonrpc": "2.0",
  "error": { "code": -32001, "message": "Unauthorized: invalid API key" },
  "id": null
}
```

The `/health` endpoint is unauthenticated by design (for load balancer probes).

## Transport: SSE and Streamable HTTP

This server exposes **two** HTTP transports:

| Endpoint | Transport | Protocol |
|---|---|---|
| `POST /mcp` | Streamable HTTP (stateless) | Modern — MCP spec 2025-03-26 |
| `GET /sse` + `POST /messages` | Server-Sent Events | Legacy — MCP spec 2024-11-05 |

Both are always enabled. Streamable HTTP is the primary transport for production use; SSE is available for backward compatibility with older MCP clients.

### Why did MCP deprecate SSE?

The MCP specification **deprecated HTTP+SSE** in version `2025-03-26` (March 2025), replacing it with **Streamable HTTP**. The TypeScript SDK marked `SSEServerTransport` as `@deprecated` starting in v1.10.0 (April 2025). The reasons are architectural:

**1. Dual-endpoint complexity.** SSE required two separate HTTP endpoints: a `GET /sse` for receiving server messages via a persistent stream, and a `POST /messages` for sending client requests. This "two-phone" model — one connection to listen, a separate one to speak — made implementations complex and error-prone. Streamable HTTP consolidates everything to a single `POST /mcp` endpoint.

**2. Load balancer and Kubernetes incompatibility.** This was the most practically damaging issue. In any deployment with multiple pods behind a load balancer, the SSE connection lands on Pod A (creating session state in memory), but subsequent POST requests get round-robined to Pod B or C — which have no knowledge of that session. This [completely breaks the protocol](https://github.com/modelcontextprotocol/typescript-sdk/issues/330). Operators were forced into fragile sticky-session configurations that prevent horizontal scaling.

**3. No stateless server support.** SSE required persistent, stateful connections even though [over 90% of MCP tool-serving use cases are effectively stateless](https://github.com/modelcontextprotocol/modelcontextprotocol/discussions/102) (client calls a tool, gets a result). The design was described as "a direct port of STDIO approach to the web, which is not how most web apps operate."

**4. No resumability.** If the SSE connection dropped mid-operation, the session was simply lost. Streamable HTTP introduces event IDs and `Last-Event-ID` header support for lossless reconnection.

**5. Infrastructure friction.** Persistent SSE connections drain file descriptors at scale, conflict with serverless platforms (Lambda, Cloudflare Workers) that don't support long-lived requests, and face issues with enterprise firewalls that terminate idle connections.

**6. Security.** SSE authenticated only at connection time. After that, the stream stayed open without re-verification. Streamable HTTP uses standard per-request HTTP semantics, naturally supporting JWT validation and CORS on every call.

**Why this server still includes SSE:** backward compatibility. The [MCP spec defines a negotiation protocol](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports) where clients first attempt Streamable HTTP, then fall back to SSE. Our Streamable HTTP endpoint (`POST /mcp`) runs in stateless mode (`sessionIdGenerator: undefined`), meaning it works behind any standard load balancer without sticky sessions.

#### References

- [PR #206: Replace HTTP+SSE with Streamable HTTP](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/206) — the definitive design document
- [Issue #330: Sticky sessions problem](https://github.com/modelcontextprotocol/typescript-sdk/issues/330) — Kubernetes breakage report
- [Discussion #102: State and long-lived connections](https://github.com/modelcontextprotocol/modelcontextprotocol/discussions/102) — community discussion
- [Why MCP Deprecated SSE — fka.dev](https://blog.fka.dev/blog/2025-06-06-why-mcp-deprecated-sse-and-go-with-streamable-http/)
- [Why MCP's Move Away from SSE Simplifies Security — Auth0](https://auth0.com/blog/mcp-streamable-http/)
- [MCP Transport Protocols Compared — MCPcat](https://mcpcat.io/guides/comparing-stdio-sse-streamablehttp/)

## Design Decisions

### MCP Implementation

Tools are registered using the modern `server.registerTool()` API (not the deprecated `server.tool()` overloads). Each tool has:

- **Zod input schemas** with `.strict()` — rejects unexpected fields, provides clear validation errors
- **Zod output schemas** — clients know the exact response structure
- **`structuredContent`** in responses — parseable JSON alongside the `content[].text` fallback
- **Tool annotations** — `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`

All three tools have clearly defined JSON schemas that the AI relies on to know how to call the code. Invalid inputs (wrong types, extra fields) are rejected by Zod before reaching any business logic.

### Asynchronous Design

The server is fully non-blocking. Every I/O operation uses `async/await` — there are zero synchronous database calls, file reads, or blocking operations in the request path.

**How the async flow is structured:**

1. **Transport layer** (`transport.ts`): Express route handlers are `async`. Each incoming request is handled without blocking others.
2. **Tool handlers** (`tools/*.ts`): Each tool callback is an `async` function that `await`s the service call and returns the result.
3. **Service layer** (`services/*.ts`): All Prisma queries use `await`. In `search_properties`, the `count()` and `findMany()` queries run **concurrently** via `Promise.all()` — the database executes both in parallel instead of sequentially:
   ```typescript
   const [total, rows] = await Promise.all([
     prisma.property.count({ where }),
     prisma.property.findMany({ where, ... }),
   ]);
   ```
4. **Content generation** (`content-generator.service.ts`): The async `findUnique()` call fetches property data, then HTML is generated synchronously in-memory (CPU-bound string operations, not I/O). If this were replaced with a real LLM API call, it would be another `await` — the architecture is ready for it.

Database queries, content generation, and HTTP handling never freeze the Node.js event loop.

### Why PostgreSQL?

Real estate data is inherently **structured and relational**: properties have fixed fields (price, bedrooms, city), enum types (status, property type), and are queried with range filters (`price BETWEEN x AND y`), equality filters (`city = 'Austin'`), and combinations of both. This maps naturally to a SQL database with typed columns and composite indexes.

PostgreSQL was chosen over alternatives for specific reasons:

- **vs. MongoDB/NoSQL**: Property data has a well-defined, consistent schema — every property has the same fields. There's no benefit to schemaless storage, and SQL's `WHERE` + `ORDER BY` + `LIMIT/OFFSET` is a more natural fit for the filter-and-paginate queries this server performs.
- **vs. SQLite**: SQLite works for single-process local tools but cannot handle concurrent connections from multiple server replicas. PostgreSQL supports connection pooling and horizontal scaling.
- **`Decimal(12,2)` for prices**: PostgreSQL's native `DECIMAL` type avoids floating-point rounding errors that would corrupt financial data.
- **`String[]` for features**: PostgreSQL's native array columns store the features list without needing a separate join table.
- **Composite indexes**: The `[city, propertyType, status]` index accelerates the most common query pattern (search by city + type + active status) in a single index scan.

**Connection management**: A single `PrismaClient` instance is created at startup and reused globally via a singleton pattern (`src/db/client.ts`). This avoids creating new connection pools on every request. The client supports `DATABASE_URL` / `DIRECT_DATABASE_URL` separation for PgBouncer compatibility in production. On shutdown, `prisma.$disconnect()` is called via the graceful shutdown handler to cleanly release all connections.

### Robustness

The system does **not** crash on invalid input. Zod schemas validate all inputs before they reach business logic:

- Passing a string into a number field (e.g., `"max_price": "abc"`) → Zod returns a structured validation error via the MCP protocol, not a server crash
- Passing an invalid UUID to `get_property_details` → Zod rejects it before the database is queried
- Extra unexpected fields → rejected by `.strict()` schemas
- Missing required fields → clear Zod error messages

Tool handlers also return meaningful `isError: true` responses for business-level errors (e.g., property not found), which the AI can understand and recover from.

### Developer Experience

The server is testable with multiple methods:

1. **MCP Inspector** — `npx @modelcontextprotocol/inspector` provides an interactive GUI to browse tools, test inputs, and inspect responses
2. **curl** — standard HTTP calls to `/mcp` or `/sse` endpoints
3. **Docker Compose** — `docker compose up` starts both PostgreSQL and the app
4. **Hot reload** — `pnpm dev` uses `tsx watch` for instant restart on file changes

## Testing

Unit tests use [Vitest](https://vitest.dev/) with mocked Prisma clients — no database required to run.

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch
```

**Test coverage (31 tests across 4 suites):**

| Suite | Tests | What's covered |
|---|---|---|
| `schemas.test.ts` | 15 | Input validation: valid inputs, type mismatches (string in number field), invalid UUIDs, invalid enums, `.strict()` rejecting extra fields |
| `search-properties.test.ts` | 6 | Filter building (city, price range, status mapping), default AVAILABLE status, empty results |
| `get-property-details.test.ts` | 3 | Full field mapping, not-found returns null, null optional fields handled |
| `generate-listing-content.test.ts` | 7 | HTML structure (`<title>`, `<meta>`, `<article>`), features list, language/tone params, not-found, XSS escaping |

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `DIRECT_DATABASE_URL` | No | — | Direct connection (bypasses PgBouncer) |
| `PORT` | No | `3000` | Server port |
| `LOG_LEVEL` | No | `info` | pino log level |
| `API_KEY` | Yes | — | Bearer token for authentication |

## Docker

```bash
# Full stack (PostgreSQL + migrations + app)
docker compose up --build

# Seed sample data (first time)
docker compose exec app pnpm db:seed

# PostgreSQL only (for local dev with pnpm dev)
docker compose up -d postgres
```

## Cloud Deployment (AWS — Quick Test)

Deploy the full stack to an EC2 instance with Docker Compose. This gives you a public URL to connect the MCP Inspector or any MCP client for live testing.

### Prerequisites

- An AWS account with an EC2 key pair
- [AWS CLI](https://aws.amazon.com/cli/) installed and configured (`aws configure`)

### 1. Launch an EC2 instance

```bash
# Create a security group allowing SSH, HTTP (health check), and the MCP server port
aws ec2 create-security-group \
  --group-name mcp-server-sg \
  --description "MCP server quick test"

aws ec2 authorize-security-group-ingress --group-name mcp-server-sg --protocol tcp --port 22 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-name mcp-server-sg --protocol tcp --port 3000 --cidr 0.0.0.0/0

# Launch (Amazon Linux 2023, t3.micro — free tier eligible)
aws ec2 run-instances \
  --image-id resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --instance-type t3.micro \
  --key-name <your-key-pair> \
  --security-groups mcp-server-sg \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=mcp-server-test}]'
```

Wait for the instance to be running, then get its public IP:

```bash
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=mcp-server-test" "Name=instance-state-name,Values=running" \
  --query "Reservations[0].Instances[0].PublicIpAddress" --output text
```

### 2. Install Docker on the instance

```bash
ssh -i <your-key>.pem ec2-user@<public-ip>

# Install Docker and Docker Compose
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

# Install Docker Compose plugin
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Re-login to pick up the docker group
exit
ssh -i <your-key>.pem ec2-user@<public-ip>
```

### 3. Deploy

```bash
git clone https://github.com/<your-user>/real-state-mcp-server.git
cd real-state-mcp-server

# Build and start
docker compose up -d --build

# Run seed data (wait a few seconds for migrations to finish)
sleep 10
docker compose exec app pnpm db:seed
```

### 4. Verify

```bash
# From your local machine
curl http://<public-ip>:3000/health

# Test MCP endpoint
curl -X POST http://<public-ip>:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer change-me-in-production" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

### 5. Connect the MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

In the Inspector UI:
- **URL**: `http://<public-ip>:3000/mcp`
- **Transport**: Streamable HTTP
- **Headers**: `Authorization: Bearer change-me-in-production`

### 6. Cleanup

```bash
# Terminate the instance
aws ec2 terminate-instances --instance-ids <instance-id>

# Delete security group (after instance is terminated)
aws ec2 delete-security-group --group-name mcp-server-sg
```

> **Note:** This setup is for quick testing only. For production, use a managed database (RDS), put the server behind a load balancer with HTTPS, and change the default `API_KEY`.

## Stack

- TypeScript (strict, ESM)
- `@modelcontextprotocol/sdk` v1.26.0
- Prisma ORM + PostgreSQL
- Express 5
- pino (structured logging)
- Zod (schema validation)
- pnpm
