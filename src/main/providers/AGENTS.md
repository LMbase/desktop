# Providers Module

**Module**: Provider API clients  
**Purpose**: Interface with OpenAI, Anthropic, Gemini, and GitHub Copilot APIs

---

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Add new provider | `providerClient.ts` | Implement ProviderClient interface |
| Provider config | `@shared/constants.ts` | PROVIDER_CONFIG record |
| Model catalog | `serverModelCatalog.ts` | Server model fetching, exchange estimates |
| Registry | `providerRegistry.ts` | Unified client access, key validation |
| Tests | `*.test.ts` | Colocated with source |

---

## CONVENTIONS

**Interface Contract**:
```typescript
class XxxClient implements ProviderClient {
  provider: Provider;           // e.g., 'openai'
  config: ProviderConfig;       // from PROVIDER_CONFIG
  validateKey(apiKey: string): Promise<ValidateResult>;
  fetchProviderModels(apiKey: string): Promise<FetchModelsResult>;
  fetchPublicProviderModels(): Promise<FetchModelsResult>;
}
```

**Model Fetching Flow**:
1. Fetch models from provider API
2. Intersect with server-supported models via `intersectPreservingOrder()`
3. Return filtered list

**Testing**: Inject `FetchLike` via constructor for mocking

---

## ANTI-PATTERNS

- **Don't skip model intersection** - Always filter against server-supported models
- **Don't hardcode API URLs** - Use PROVIDER_CONFIG from constants
- **Don't use direct API keys for Copilot** - Requires GitHub token exchange flow
