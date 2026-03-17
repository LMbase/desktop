# Renderer Module

**Module**: React frontend  
**Purpose**: Provider/model selection, token budget configuration, session monitoring

---

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Global state | `store/appStore.ts` | Zustand with atomic setters |
| Form validation | `lib/validators.ts` | Pure functions returning ValidationError[] |
| Provider UI | `components/setup/ProviderCardGrid.tsx` | Grid of provider buttons |
| Model selection | `components/setup/ModelSelect.tsx` | Dropdown with available models |
| Session monitoring | `components/session/` | Real-time usage, connection status |
| Copilot OAuth | `hooks/useCopilotAuth.ts` | Device flow with event subscription |
| Session events | `hooks/useSessionEvents.ts` | Subscribes to session updates |

---

## CONVENTIONS

- **Atomic setters**: Each field has dedicated setter (`setOfferProvider`, etc.)
- **Selectors**: Export memoized selectors from store bottom
- **Hook pattern**: Hooks subscribe to IPC events, return cleanup functions
- **CSS**: Pure CSS files (no Tailwind), light theme

---

## IPC API REFERENCE

```typescript
window.tokenhub.providers.getModels(provider)
window.tokenhub.auth.startCopilotAuth()
window.tokenhub.session.start(config)
window.tokenhub.session.stop()
window.tokenhub.session.getSnapshot()
window.tokenhub.session.onSessionUpdate(fn)
window.tokenhub.settings.get(key)
```

---

## ANTI-PATTERNS

- **Never call IPC directly in components** — Use custom hooks
- **Never store API keys in Zustand** — Keys sent directly to main process
- **Never use React context** — Zustand replaces context
- **Never skip validation** — Always call validators before IPC calls
