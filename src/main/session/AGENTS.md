# Session Module

**Module**: P2P session lifecycle management  
**Purpose**: WebSocket pairing, proxy/tunnel coordination, token tracking, activity logging

---

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Start/stop session | `sessionController.ts` | Main entry - start(), stop(), getSnapshot() |
| State transitions | `sessionState.ts` | Reducer pattern - reduceSessionState() |
| WebSocket protocol | `pairingSocket.ts` | connect(), readMessage(), sendRegister() |
| Runtime factory | `createSessionRuntime.ts` | Creates proxy + tunnel for session |
| Register messages | `registerMessage.ts` | buildInitial/RemainingRegisterMessage() |
| Activity logging | `activityLog.ts` | In-memory event log with subscribers |
| IPC publishing | `publishSessionEvents.ts` | Publishes sanitized snapshots to renderer |

---

## KEY PATTERNS

### Factory Functions
All modules use factory pattern: `createXxx(options?) => XxxInterface`

### Reducer State Management
```typescript
type SessionAction = 
  | { type: 'session.start'; config: ExchangeConfig }
  | { type: 'session.paired'; pairing: PairingInfo }
  | { type: 'session.localUsage'; inputTokens: number; outputTokens: number }
  | { type: 'session.clearPairing' }
  | { type: 'session.error'; message: string };

reduceSessionState(state, action) => newState
```

### Serial Execution Queue
```typescript
let serial = Promise.resolve();
const withSerial = async (fn) => {
  serial = serial.then(fn, fn);
  await serial;
};
```

### Queue/Waiter Pattern
PairingSocket uses custom queue for WebSocket events:
```typescript
const queue: SocketEvent[] = [];
const waiters: Array<(event: SocketEvent) => void> = [];
// readEvent() dequeues or waits
```

### Zod-Wire Protocol
All WebSocket messages validated with Zod before processing.

---

## ANTI-PATTERNS

1. **Never mutate state.snapshot directly** - Always use dispatch(reduceSessionState(...))
2. **Never skip Zod validation** - Even trusted server responses must be validated
3. **Never assume socket is open** - Check isOpen() before send operations
4. **Never leak proxyKey to renderer** - Always sanitized in publishSessionEvents
