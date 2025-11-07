// client/src/__tests__/online-mode/utils/testHelpers.ts
import { io, Socket } from "socket.io-client";
import type { Card } from "../../../utils/cardUtils";
import type { GameState } from "../../../utils/gameLogic";

/**
 * Configuration for test server
 */
export const TEST_SERVER_URL = "http://localhost:4000";

/**
 * Create a socket.io client for testing
 */
export function createTestSocket(
  url: string = TEST_SERVER_URL,
  options?: any
): Socket {
  return io(url, {
    transports: ["websocket"],
    autoConnect: false,
    ...options,
  });
}

/**
 * Connect and wait for connection to be established
 */
export function connectSocket(socket: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socket.connected) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error("Connection timeout"));
    }, 5000);

    socket.once("connect", () => {
      clearTimeout(timeout);
      resolve();
    });

    socket.once("connect_error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    socket.connect();
  });
}

/**
 * Disconnect socket and wait for disconnection
 */
export function disconnectSocket(socket: Socket): Promise<void> {
  return new Promise((resolve) => {
    if (!socket.connected) {
      resolve();
      return;
    }

    socket.once("disconnect", () => {
      resolve();
    });

    socket.disconnect();
  });
}

/**
 * Wait for a specific event from socket
 */
export function waitForEvent<T = any>(
  socket: Socket,
  eventName: string,
  timeout: number = 5000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeout);

    const handler = (data: T) => {
      clearTimeout(timeoutId);
      resolve(data);
    };

    socket.once(eventName, handler);
  });
}

/**
 * Wait for multiple events from socket
 */
export function waitForEvents(
  socket: Socket,
  eventNames: string[],
  timeout: number = 5000
): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const results: Record<string, any> = {};
    let remaining = eventNames.length;

    const timeoutId = setTimeout(() => {
      eventNames.forEach((name) => socket.off(name));
      reject(
        new Error(
          `Timeout waiting for events. Received: ${Object.keys(results).join(", ")}`
        )
      );
    }, timeout);

    eventNames.forEach((eventName) => {
      socket.once(eventName, (data) => {
        results[eventName] = data;
        remaining--;

        if (remaining === 0) {
          clearTimeout(timeoutId);
          resolve(results);
        }
      });
    });
  });
}

/**
 * Join a room and wait for confirmation
 */
export async function joinRoom(
  socket: Socket,
  roomId: string,
  playerName: string
): Promise<GameState> {
  socket.emit("join-room", { roomId, playerName });
  return await waitForEvent<GameState>(socket, "game-state-update");
}

/**
 * Start a game and wait for confirmation
 */
export async function startGame(
  socket: Socket,
  roomId: string
): Promise<GameState> {
  socket.emit("start-game", { roomId });
  await waitForEvent(socket, "start-game");
  return await waitForEvent<GameState>(socket, "game-state-update");
}

/**
 * Draw a card and wait for the drawn card
 */
export async function drawCard(
  socket: Socket,
  roomId: string,
  playerId: string
): Promise<{ card: Card; gameState: GameState }> {
  socket.emit("draw-card", { roomId, playerId });

  const [card, gameState] = await Promise.all([
    waitForEvent<Card>(socket, "card-drawn"),
    waitForEvent<GameState>(socket, "game-state-update"),
  ]);

  return { card, gameState };
}

/**
 * Discard a card (server uses 'discard-card' event)
 */
export async function discardDrawnCard(
  socket: Socket,
  roomId: string,
  playerId: string,
  cardId: string
): Promise<GameState> {
  socket.emit("discard-card", { roomId, playerId, cardId });
  return await waitForEvent<GameState>(socket, "game-state-update");
}

/**
 * Eliminate a card
 */
export async function eliminateCard(
  socket: Socket,
  roomId: string,
  playerId: string,
  cardId: string
): Promise<GameState> {
  socket.emit("eliminate-card", { roomId, playerId, cardId });
  return await waitForEvent<GameState>(socket, "game-state-update");
}

/**
 * Helper to create a room with multiple players
 */
export async function createRoomWithPlayers(
  playerNames: string[]
): Promise<{
  roomId: string;
  sockets: Socket[];
  gameState: GameState;
}> {
  const roomId = `test-room-${Date.now()}`;
  const sockets: Socket[] = [];

  for (const playerName of playerNames) {
    const socket = createTestSocket();
    await connectSocket(socket);
    await joinRoom(socket, roomId, playerName);
    sockets.push(socket);
  }

  // Get the final game state after all players joined
  const gameState = await waitForEvent<GameState>(
    sockets[0],
    "game-state-update"
  );

  return { roomId, sockets, gameState };
}

/**
 * Helper to cleanup sockets
 */
export async function cleanupSockets(sockets: Socket[]): Promise<void> {
  await Promise.all(sockets.map((socket) => disconnectSocket(socket)));
}

/**
 * Wait for a specific time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a unique room ID for testing
 */
export function generateRoomId(): string {
  return `test-room-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Assert game state properties
 */
export function assertGameState(
  gameState: GameState,
  expected: Partial<GameState>
): void {
  if (expected.gameStatus !== undefined) {
    if (gameState.gameStatus !== expected.gameStatus) {
      throw new Error(
        `Expected gameStatus to be ${expected.gameStatus}, but got ${gameState.gameStatus}`
      );
    }
  }

  if (expected.players !== undefined) {
    if (gameState.players.length !== expected.players.length) {
      throw new Error(
        `Expected ${expected.players.length} players, but got ${gameState.players.length}`
      );
    }
  }

  if (expected.currentPlayerIndex !== undefined) {
    if (gameState.currentPlayerIndex !== expected.currentPlayerIndex) {
      throw new Error(
        `Expected currentPlayerIndex to be ${expected.currentPlayerIndex}, but got ${gameState.currentPlayerIndex}`
      );
    }
  }
}

/**
 * Mock event listener for testing
 */
export class MockEventListener {
  private events: Array<{ event: string; data: any; timestamp: number }> = [];

  listen(socket: Socket, eventNames: string[]): void {
    eventNames.forEach((eventName) => {
      socket.on(eventName, (data) => {
        this.events.push({
          event: eventName,
          data,
          timestamp: Date.now(),
        });
      });
    });
  }

  getEvents(eventName?: string): Array<{ event: string; data: any }> {
    if (eventName) {
      return this.events.filter((e) => e.event === eventName);
    }
    return this.events;
  }

  getEventData(eventName: string, index: number = 0): any {
    const events = this.getEvents(eventName);
    return events[index]?.data;
  }

  clear(): void {
    this.events = [];
  }

  getEventCount(eventName?: string): number {
    return this.getEvents(eventName).length;
  }

  waitForEventCount(
    eventName: string,
    count: number,
    timeout: number = 5000
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkInterval = setInterval(() => {
        if (this.getEventCount(eventName) >= count) {
          clearInterval(checkInterval);
          resolve();
        }

        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(
            new Error(
              `Timeout waiting for ${count} ${eventName} events. Got ${this.getEventCount(eventName)}`
            )
          );
        }
      }, 50);
    });
  }
}
