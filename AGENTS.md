# TokenHub Desktop - Project Knowledge Base

**Project**: TokenHub P2P Token Exchange Desktop App  
**Stack**: Electron + TypeScript + React + Vite  
**Runtime**: Bun  

---

## FIRST PRINCIPLES

> **Leave the code better than you found it.**
>
> Code is a sacred place. Every line of bad code we write today will cost hours of refactoring tomorrow—or force abandonment of the project. Resist the urge to implement hacky solutions. Focus on improving software design from the fundamental level. Every LLM writing on this code should internalize these principles.

---

## PROJECT OVERVIEW

P2P LLM token exchange desktop application. Replaces the Python TUI client. Electron-based with secure IPC architecture.

**Core Responsibility**: Enable users to exchange LLM API tokens peer-to-peer through a local HTTP proxy with secure credential management.

---

## ARCHITECTURE

```
src/
├── main/              # Electron main process (Node.js)
│   ├── providers/     # API clients (OpenAI, Anthropic, Gemini, Copilot)
│   ├── proxy/         # HTTP proxy with token counting
│   ├── session/       # WebSocket pairing logic
│   ├── storage/       # Secure storage (safeStorage)
│   ├── auth/          # Copilot OAuth flow
│   ├── ipc/           # IPC handlers
│   ├── tunnel/        # ngrok tunnel management
│   ├── window/        # Window management
│   └── logging/       # Logger
├── renderer/          # React app (Chromium process)
│   ├── components/    # UI components (setup, session)
│   ├── pages/         # SetupPage, SessionPage
│   ├── hooks/         # React hooks
│   ├── store/         # Zustand state management
│   ├── lib/           # Utilities
│   └── styles/        # CSS (no Tailwind)
├── preload/           # Secure IPC bridge
└── shared/            # Shared code
    ├── contracts/     # Zod schemas
    └── lib/           # Helper functions
```

---

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add new provider | `src/main/providers/` | Extend `ProviderClient` interface |
| Change session logic | `src/main/session/` | Complex state machine - see local AGENTS.md |
| Modify proxy behavior | `src/main/proxy/` | Token counting, routing - see local AGENTS.md |
| Update UI state | `src/renderer/store/` | Zustand store |
| Add IPC channel | `src/main/ipc/` + `src/preload/` | Register in both places |
| Shared types | `src/shared/contracts/` | Zod schemas for validation |
| Tests | `src/**/*.test.ts` | Colocated with source files |

---

## CODE MAP

**High Centrality Files** (many exports/references):

| File | Exports | Role |
|------|---------|------|
| `src/renderer/store/appStore.ts` | 16 | Central state management |
| `src/shared/contracts/websocket.ts` | 14 | WebSocket protocol types |
| `src/renderer/lib/validators.ts` | 12 | Form validation |
| `src/shared/contracts/providers.ts` | 10 | Provider contracts |
| `src/shared/contracts/session.ts` | 10 | Session contracts |
| `src/main/session/sessionState.ts` | 7 | Session state machine |

**Complex Modules** (>200 lines):

| Module | Lines | Files |
|--------|-------|-------|
| `src/main/session/` | 1539 | 9 files |
| `src/main/proxy/` | 1229 | 10 files |
| `src/main/providers/` | ~800 | 14 files |

---

## CONVENTIONS

**TypeScript**:
- Strict mode enabled
- All IPC uses typed contracts (Zod schemas)
- Prefer `type` over `interface` for data structures
- Use path aliases: `@shared/*` for shared code

**Testing**:
- Tests colocated with source: `*.test.ts`
- Vitest for unit/integration, Playwright for E2E
- Tests are the source of truth for behavior

**State Management**:
- Main process: Functional modules with factory functions
- Renderer: Zustand for global state, React hooks for local

**Security**:
- API keys stored with OS-level encryption (safeStorage)
- Renderer never sees real provider keys
- IPC uses contextBridge, never exposes raw ipcRenderer
- All inputs validated with Zod

**CSS/Styling**:
- No Tailwind - pure CSS files
- Light theme, high contrast
- No gradients or glassmorphism
- Colors: #fafafa (bg), #18181b (text), #52525b (secondary)

**Error Handling**:
- Return `{ success: boolean, error?: string }` patterns
- Log errors with structured logger
- Never suppress errors silently

---

## ANTI-PATTERNS (FORBIDDEN)

1. **Never expose API keys to renderer** - Must stay in main process
2. **Never use `any` type** - Strict TypeScript enforcement
3. **Never skip Zod validation** - All external inputs must be validated
4. **Never store secrets in plain text** - Use safeStorage API
5. **Never mutate state directly** - Use Zustand setters or session dispatch
6. **Never bypass IPC abstraction** - Always use typed preload APIs
7. **Never use Tailwind** - CSS files only

---

## COMMANDS

```bash
# Development
bun run dev                    # Start Electron dev mode
bun run test                   # Run Vitest in watch mode
bun run test:run              # Run tests once
bun run test:coverage         # Coverage report
bun run test:ui               # Vitest UI
bun run e2e                   # Playwright tests
bun run e2e:headed            # Playwright with browser

# Quality
bun run lint                  # ESLint check
bun run typecheck             # TypeScript check

# Build
bun run build                 # Package for current platform
bun run make                  # Create distributables
```

---

## TESTING STRATEGY

- **Unit/Integration**: Vitest with happy-dom for renderer
- **E2E**: Playwright for full user flows
- **Coverage**: All new code must have tests
- **Patterns**: Mock external APIs, test state transitions

---

## ENVIRONMENT

```bash
TOKENHUB_SERVER=ws://localhost:8080    # WebSocket server URL
NGROK_AUTHTOKEN=xxx                    # ngrok auth token
TOKENHUB_LOG=~/tokenhub.log            # Log file path
TOKENHUB_DEBUG=1                       # Enable debug logging
```

---

## CHILD AGENTS

Complex modules have their own AGENTS.md:

- [`src/main/session/`](./src/main/session/AGENTS.md) - Session state machine, pairing, WebSocket
- [`src/main/proxy/`](./src/main/proxy/AGENTS.md) - HTTP proxy, token counting, routing
- [`src/main/providers/`](./src/main/providers/AGENTS.md) - Provider clients
- [`src/renderer/`](./src/renderer/AGENTS.md) - React app, state management

---

## NOTES

- Uses Bun as runtime and package manager
- Vite for build (main, preload, renderer each have own config)
- Electron Forge for packaging
- WebSocket for P2P pairing
- Fastify for local HTTP proxy
- ngrok for tunneling
