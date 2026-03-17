# Proxy Module

**Module**: HTTP proxy with token counting  
**Purpose**: Routes LLM requests through local Fastify server with per-request budget enforcement

---

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Add new provider | `providerRouteMap.ts` | Add entry to PROVIDER_ROUTE_MAP |
| Change budget logic | `budgetTracker.ts` | wouldExceed(), clampToRemaining() |
| Streaming token counting | `sseUsageAccumulator.ts` | pushChunk() during SSE stream |
| Request validation | `requestGuard.ts` | verifyTempKey(), enforceModel(), capOutputTokens() |
| Header security | `headerPolicy.ts` | buildUpstreamHeaders(), strip hop-by-hop |
| Response parsing | `usageExtractor.ts` | extractUsage() per provider |
| Main server | `createProxyServer.ts` | handleProxyRequest() pipeline |

---

## CONVENTIONS

- **Budget snapshots**: Use `snapshot()` before streaming, compare with `wouldExceed()` during stream
- **Provider-specific logic**: Each provider has unique auth headers, route format, usage field names
- **Async streaming**: `reply.hijack()` for low-level stream control
- **Error-safe parsing**: All JSON.parse wrapped in try/catch

---

## ANTI-PATTERNS

1. **Never call budgetTracker directly in streaming** - Use snapshot/wouldExceed pattern
2. **Never trust client max_tokens** - Always cap with capOutputTokens()
3. **Never forward incoming auth headers** - Strip with INCOMING_AUTH_HEADERS, replace with temp key
4. **Never assume non-streaming format** - Providers vary: OpenAI uses `usage.completion_tokens`, Anthropic uses `usage.output_tokens`
