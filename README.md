# TokenHub Desktop

Electron desktop app for P2P LLM token exchange. Replaces the Python TUI client.

## Architecture

- **Main Process**: Node.js with full system access
  - Provider API clients (OpenAI, Anthropic, Gemini, Copilot)
  - Local HTTP proxy with token counting
  - WebSocket pairing client
  - Secure storage (safeStorage)
  - ngrok tunnel management

- **Renderer Process**: React + TypeScript
  - Setup page (provider/model selection, token budget)
  - Session page (active exchange monitoring)

- **Preload**: Secure IPC bridge between main and renderer

## Tech Stack

- **Runtime**: Bun + Electron
- **Build**: Vite + Electron Forge
- **UI**: React 18 + CSS (no Tailwind)
- **State**: Zustand
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Validation**: Zod schemas throughout

## Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Run tests
bun run test
bun run test:run

# Run E2E tests
bun run e2e

# Build for production
bun run build

# Package for distribution
bun run make
```

## Environment Variables

```bash
TOKENHUB_SERVER=ws://localhost:8080    # WebSocket server URL
NGROK_AUTHTOKEN=xxx                    # ngrok auth token
TOKENHUB_LOG=~/tokenhub.log            # Log file path
TOKENHUB_DEBUG=1                       # Enable debug logging
```

## File Structure

```
desktop/
├── src/
│   ├── shared/           # Shared contracts and utilities
│   │   ├── contracts/    # Zod schemas (session, websocket, ipc)
│   │   └── lib/          # Helper functions (tokens, snippets)
│   ├── main/             # Main process (Node.js)
│   │   ├── providers/    # API clients for each provider
│   │   ├── proxy/        # HTTP proxy with token counting
│   │   ├── session/      # WebSocket pairing logic
│   │   ├── storage/      # Secure storage
│   │   ├── auth/         # Copilot OAuth flow
│   │   ├── ipc/          # IPC handlers
│   │   └── window/       # Window management
│   ├── preload/          # Preload scripts (secure bridge)
│   └── renderer/         # React app
│       ├── components/   # UI components
│       ├── pages/        # SetupPage, SessionPage
│       ├── hooks/        # React hooks
│       ├── store/        # Zustand store
│       └── styles/       # CSS files
├── e2e/                  # Playwright tests
└── package.json
```

## Testing

All functionality is tested:

- **Unit tests**: 22 test files covering providers, proxy, storage, auth
- **Integration tests**: Session controller, WebSocket protocol
- **E2E tests**: Full user flows with Playwright

Tests are the source of truth for behavior. See `src/**/*.test.ts`

## Design

Light theme, high contrast, no gradients or glassmorphism:
- Background: #fafafa
- Text: #18181b (primary), #52525b (secondary)
- Accents: Green for success, red for errors

Matches the approved redesign.html mockup exactly.

## Security

- API keys stored with OS-level encryption (safeStorage)
- Renderer never sees real provider keys
- IPC uses contextBridge, never exposes raw ipcRenderer
- All inputs validated with Zod
