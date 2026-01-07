# Online Mode Integration Tests

This directory contains integration tests for the online multiplayer mode using real Socket.IO connections.

## Overview

These tests verify that the Socket.IO client can properly communicate with the server and that multiplayer game flows work correctly across network connections. Unlike the DualPlayerMockSocket tests which use a mock implementation, these tests use real Socket.IO connections to a running server.

## Test Files

### 1. `socket-integration.test.ts`
Tests basic Socket.IO connectivity and room management:
- Connection/disconnection
- Room joining/leaving
- Player management
- Error handling
- Concurrent operations
- Connection stability

### 2. `game-flow.test.ts`
Tests complete game flows with real multiplayer scenarios:
- Game start with multiple players
- Turn-based gameplay
- Card actions (draw, discard, replace)
- Special card powers
- Card elimination
- Game end and scoring
- Multi-player scenarios
- Event broadcasting

### 3. `utils/testHelpers.ts`
Utility functions for testing:
- Socket creation and connection helpers
- Event waiting utilities
- Room management helpers
- Mock event listeners
- Game action helpers

## Prerequisites

### Server Must Be Running
Before running these tests, you **MUST** start the game server:

```bash
# In the server directory
cd server
npm install
npm run dev
```

The server should be running on `http://localhost:4000`.

### Install Dependencies
Make sure all dependencies are installed:

```bash
# In the client directory
cd client
npm install
```

Required packages:
- `vitest` - Test runner
- `socket.io-client` - Socket.IO client library

## Running the Tests

### Run All Online Mode Tests
```bash
npm run test:online
```

### Run Specific Test File
```bash
# Socket integration tests only
npx vitest run src/__tests__/online-mode/socket-integration.test.ts

# Game flow tests only
npx vitest run src/__tests__/online-mode/game-flow.test.ts
```

### Run in Watch Mode
```bash
npx vitest watch src/__tests__/online-mode/
```

### Run with Coverage
```bash
npx vitest run --coverage src/__tests__/online-mode/
```

## Test Structure

Each test follows this pattern:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestSocket,
  connectSocket,
  cleanupSockets
} from "./utils/testHelpers";

describe("Feature Test", () => {
  const sockets: Socket[] = [];

  afterEach(async () => {
    await cleanupSockets(sockets);
    sockets.length = 0;
  });

  it("should do something", async () => {
    const socket = createTestSocket();
    sockets.push(socket);

    await connectSocket(socket);

    // Test logic here

    expect(socket.connected).toBe(true);
  });
});
```

## Key Testing Patterns

### 1. Socket Lifecycle Management
Always track sockets in an array and clean them up:

```typescript
const sockets: Socket[] = [];

afterEach(async () => {
  await cleanupSockets(sockets);
  sockets.length = 0;
});
```

### 2. Waiting for Events
Use helper functions to wait for socket events:

```typescript
import { waitForEvent } from "./utils/testHelpers";

// Wait for a single event
const gameState = await waitForEvent(socket, "game-state-update");

// Wait for multiple events
const events = await waitForEvents(socket, ["start-game", "game-state-update"]);
```

### 3. Room Setup
Create rooms with multiple players:

```typescript
import { createRoomWithPlayers } from "./utils/testHelpers";

const { roomId, sockets, gameState } = await createRoomWithPlayers([
  "Player 1",
  "Player 2",
  "Player 3"
]);
```

### 4. Game Actions
Use helper functions for common game actions:

```typescript
// Join a room
const gameState = await joinRoom(socket, roomId, "Player Name");

// Start a game
const startedState = await startGame(socket, roomId);

// Draw a card
const { card, gameState } = await drawCard(socket, roomId, playerId);

// Discard a card
const newState = await discardDrawnCard(socket, roomId, playerId, cardId);
```

## Common Issues and Solutions

### Issue: Connection Timeout
**Error**: `Timeout waiting for event: connect`

**Solution**: Make sure the server is running on `http://localhost:4000`
```bash
cd server && npm run dev
```

### Issue: Tests Hanging
**Error**: Tests don't complete

**Solution**:
1. Check that all sockets are being cleaned up in `afterEach`
2. Make sure you're using `await` for all async operations
3. Check server logs for errors

### Issue: Port Already in Use
**Error**: `EADDRINUSE: address already in use`

**Solution**: Kill existing server process
```bash
# Find process using port 4000
lsof -ti:4000

# Kill the process
kill -9 <PID>
```

### Issue: Random Test Failures
**Cause**: Race conditions or timing issues

**Solution**:
1. Increase timeout values in `waitForEvent` calls
2. Use `waitForEvents` to wait for all necessary events
3. Add delays between operations if needed: `await wait(100)`

## Comparison with DualPlayerMockSocket

| Aspect | DualPlayerMockSocket | Online Mode Tests |
|--------|---------------------|-------------------|
| **Connection** | Simulated (in-memory) | Real Socket.IO |
| **Network** | No network calls | Actual HTTP/WebSocket |
| **Server** | Not required | Must be running |
| **Speed** | Very fast | Slower (network latency) |
| **Isolation** | Complete isolation | Shared server state |
| **Use Case** | Unit/component tests | Integration tests |
| **Reliability** | Very reliable | Can have network issues |

## Test Coverage

The online mode tests cover:

- ✅ Socket connection and disconnection
- ✅ Room creation and joining
- ✅ Player management (host, multiple players)
- ✅ Game start flow
- ✅ Turn-based gameplay
- ✅ Card drawing and discarding
- ✅ Card replacement
- ✅ Card elimination (valid and invalid)
- ✅ Special card powers
- ✅ Game end and declare
- ✅ Score calculation
- ✅ Return to lobby
- ✅ Multi-player scenarios (2-4 players)
- ✅ Event broadcasting
- ✅ Error handling
- ✅ Concurrent operations

## Best Practices

1. **Always clean up sockets**: Use `afterEach` to disconnect all sockets
2. **Use unique room IDs**: Generate unique IDs with `generateRoomId()`
3. **Wait for events**: Always await socket events before continuing
4. **Handle timeouts**: Set appropriate timeouts for slow operations
5. **Check server logs**: Monitor server output for debugging
6. **Test isolation**: Each test should be independent
7. **Async/await**: Always use async/await for socket operations

## Debugging Tips

### Enable Verbose Logging
In `testHelpers.ts`, you can enable socket.io client debugging:

```typescript
import { io } from "socket.io-client";

const socket = io(url, {
  transports: ["websocket"],
  autoConnect: false,
  // Enable debugging
  debug: true
});
```

### Monitor Server Logs
Watch server output while running tests:
```bash
cd server && npm run dev
```

### Use Vitest UI
For better debugging experience:
```bash
npx vitest --ui
```

### Add Console Logs
Temporarily add logs to understand test flow:
```typescript
console.log("Game State:", JSON.stringify(gameState, null, 2));
console.log("Socket ID:", socket.id);
console.log("Current Player:", gameState.players[gameState.currentPlayerIndex]);
```

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Add cleanup in `afterEach`
3. Use helper functions from `testHelpers.ts`
4. Add appropriate comments
5. Test both success and error cases
6. Ensure tests are isolated and independent
7. Update this README if adding new test files

## Performance

Online mode tests are slower than unit tests because they:
- Make real network connections
- Wait for server responses
- Process actual game logic on the server

Typical test execution times:
- Single test: 100-500ms
- Full socket integration suite: 10-20 seconds
- Full game flow suite: 20-40 seconds
- All online tests: 30-60 seconds

## Future Improvements

Potential areas for expansion:
- [ ] Test reconnection scenarios
- [ ] Test network interruption handling
- [ ] Test with high latency simulation
- [ ] Test concurrent games in different rooms
- [ ] Test memory leaks with long-running games
- [ ] Test with 5+ players
- [ ] Performance benchmarks
- [ ] Load testing with many concurrent users

## Related Files

- `../../utils/DualPlayerMockSocket.ts` - Mock socket for offline testing
- `../../TestControlPanel.tsx` - Manual testing UI
- `../../../server/index.js` - Game server implementation
- `../../socket.ts` - Socket.IO client wrapper

## License

This test suite is part of the Declare Card Game project.
