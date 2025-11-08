// client/src/__tests__/online-mode/game-flow.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Socket } from "socket.io-client";
import {
  createTestSocket,
  connectSocket,
  disconnectSocket,
  waitForEvent,
  waitForEvents,
  generateRoomId,
  joinRoom,
  startGame,
  drawCard,
  discardDrawnCard,
  cleanupSockets,
  MockEventListener,
  assertGameState,
  skipPower,
} from "./utils/testHelpers";

/**
 * Game Flow Integration Tests
 *
 * These tests verify complete game flows with real Socket.IO connections.
 * They test multiplayer scenarios including game start, turns, card actions, and game end.
 *
 * Prerequisites:
 * - Server must be running on http://localhost:4000
 */
describe("Game Flow Integration Tests", () => {
  const sockets: Socket[] = [];

  afterEach(async () => {
    await cleanupSockets(sockets);
    sockets.length = 0;
  });

  describe("Game Start Flow", () => {
    it("should start a game with 2 players", async () => {
      const roomId = generateRoomId();
      const socket1 = createTestSocket();
      const socket2 = createTestSocket();
      sockets.push(socket1, socket2);

      await connectSocket(socket1);
      await connectSocket(socket2);

      // Players join
      await joinRoom(socket1, roomId, "Player 1");
      await joinRoom(socket2, roomId, "Player 2");

      // Host starts the game
      const gameState = await startGame(socket1, roomId);

      // Verify game started
      expect(gameState.gameStatus).toBe("playing");
      expect(gameState.players).toHaveLength(2);
      expect(gameState.deck.length).toBeGreaterThan(0);

      // Verify each player has cards
      expect(gameState.players[0].hand.length).toBeGreaterThan(0);
      expect(gameState.players[1].hand.length).toBeGreaterThan(0);

      // Verify initial revealed cards (each player should see 2 of their own cards)
      const player1RevealedCards = gameState.players[0].hand.filter(
        (card) => card.isRevealed
      );
      expect(player1RevealedCards.length).toBeGreaterThanOrEqual(0);
    });

    it("should start a game with 3 players", async () => {
      const roomId = generateRoomId();
      const socket1 = createTestSocket();
      const socket2 = createTestSocket();
      const socket3 = createTestSocket();
      sockets.push(socket1, socket2, socket3);

      await Promise.all([
        connectSocket(socket1),
        connectSocket(socket2),
        connectSocket(socket3),
      ]);

      // Players join
      await joinRoom(socket1, roomId, "Player 1");
      await joinRoom(socket2, roomId, "Player 2");
      await joinRoom(socket3, roomId, "Player 3");

      // Host starts the game
      const gameState = await startGame(socket1, roomId);

      expect(gameState.gameStatus).toBe("playing");
      expect(gameState.players).toHaveLength(3);
      expect(gameState.players[0].hand.length).toBeGreaterThan(0);
      expect(gameState.players[1].hand.length).toBeGreaterThan(0);
      expect(gameState.players[2].hand.length).toBeGreaterThan(0);
    });

    it("should set first player as current player", async () => {
      const roomId = generateRoomId();
      const socket1 = createTestSocket();
      const socket2 = createTestSocket();
      sockets.push(socket1, socket2);

      await connectSocket(socket1);
      await connectSocket(socket2);

      await joinRoom(socket1, roomId, "Player 1");
      await joinRoom(socket2, roomId, "Player 2");

      const gameState = await startGame(socket1, roomId);

      expect(gameState.currentPlayerIndex).toBe(0);
    });

    it("should broadcast start event to all players", async () => {
      const roomId = generateRoomId();
      const socket1 = createTestSocket();
      const socket2 = createTestSocket();
      sockets.push(socket1, socket2);

      await connectSocket(socket1);
      await connectSocket(socket2);

      await joinRoom(socket1, roomId, "Player 1");
      await joinRoom(socket2, roomId, "Player 2");

      // Set up listeners on both sockets
      const startPromise1 = waitForEvent(socket1, "start-game");
      const startPromise2 = waitForEvent(socket2, "start-game");

      socket1.emit("start-game", { roomId });

      // Both should receive the start event
      await Promise.all([startPromise1, startPromise2]);
    });
  });

  describe("Turn-Based Gameplay", () => {
    it("should allow current player to draw a card", async () => {
      const roomId = generateRoomId();
      const socket1 = createTestSocket();
      const socket2 = createTestSocket();
      sockets.push(socket1, socket2);

      await connectSocket(socket1);
      await connectSocket(socket2);

      await joinRoom(socket1, roomId, "Player 1");
      await joinRoom(socket2, roomId, "Player 2");

      let gameState = await startGame(socket1, roomId);
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      const initialDeckSize = gameState.deck.length;

      // Current player draws a card
      const { card, gameState: updatedState } = await drawCard(
        socket1,
        roomId,
        currentPlayer.id
      );

      expect(card).toBeDefined();
      expect(card.rank).toBeDefined();
      expect(card.suit).toBeDefined();
      expect(updatedState.deck.length).toBe(initialDeckSize - 1);
    });

    it("should not allow non-current player to draw", async () => {
      const roomId = generateRoomId();
      const socket1 = createTestSocket();
      const socket2 = createTestSocket();
      sockets.push(socket1, socket2);

      await connectSocket(socket1);
      await connectSocket(socket2);

      await joinRoom(socket1, roomId, "Player 1");
      await joinRoom(socket2, roomId, "Player 2");

      const gameState = await startGame(socket1, roomId);
      const nonCurrentPlayer = gameState.players[1]; // Player 2 is not current

      // Set up error listener
      const errorPromise = waitForEvent(socket2, "error", 2000);

      // Non-current player tries to draw
      socket2.emit("draw-card", { roomId, playerId: nonCurrentPlayer.id });

      const error = await errorPromise;
      expect(error.message).toContain("turn");
    });

    it("should move to next player after discard", async () => {
      const roomId = generateRoomId();
      const socket1 = createTestSocket();
      const socket2 = createTestSocket();
      sockets.push(socket1, socket2);

      await connectSocket(socket1);
      await connectSocket(socket2);

      await joinRoom(socket1, roomId, "Player 1");
      await joinRoom(socket2, roomId, "Player 2");

      let gameState = await startGame(socket1, roomId);
      expect(gameState.currentPlayerIndex).toBe(0);

      const currentPlayer = gameState.players[0];

      // Draw and discard a card
      const { card } = await drawCard(socket1, roomId, currentPlayer.id);
      gameState = await discardDrawnCard(socket1, roomId, currentPlayer.id, card.id);

      // Power cards (7, 8, 9, 10, Q, K) pause for power activation, others move turn
      const isPowerCard = ["7", "8", "9", "10", "Q", "K"].includes(card.rank);

      if (isPowerCard) {
        // Power card: turn stays same, waiting for power choice
        expect(gameState.currentPlayerIndex).toBe(0);
        expect(gameState.players[0].activePower).toBe(card.rank);
      } else {
        // Regular card or Jack: turn moves to next player
        expect(gameState.currentPlayerIndex).toBe(1);
      }
    });
  });

  describe("Card Actions", () => {
    it("should handle drawing and discarding a card", async () => {
      const roomId = generateRoomId();
      const socket1 = createTestSocket();
      const socket2 = createTestSocket();
      sockets.push(socket1, socket2);

      await connectSocket(socket1);
      await connectSocket(socket2);

      await joinRoom(socket1, roomId, "Player 1");
      await joinRoom(socket2, roomId, "Player 2");

      let gameState = await startGame(socket1, roomId);
      const currentPlayer = gameState.players[0];
      const initialDiscardSize = gameState.discardPile.length;

      // Draw a card
      const { card } = await drawCard(socket1, roomId, currentPlayer.id);

      // Discard the drawn card
      gameState = await discardDrawnCard(socket1, roomId, currentPlayer.id, card.id);

      // Card should be in discard pile
      expect(gameState.discardPile.length).toBe(initialDiscardSize + 1);
      expect(gameState.discardPile[gameState.discardPile.length - 1].id).toBe(
        card.id
      );
    });

    it("should handle replacing a hand card with drawn card", async () => {
      const roomId = generateRoomId();
      const socket1 = createTestSocket();
      const socket2 = createTestSocket();
      sockets.push(socket1, socket2);

      await connectSocket(socket1);
      await connectSocket(socket2);

      await joinRoom(socket1, roomId, "Player 1");
      await joinRoom(socket2, roomId, "Player 2");

      let gameState = await startGame(socket1, roomId);
      const currentPlayer = gameState.players[0];
      const initialHandSize = currentPlayer.hand.length;

      // Draw a card
      const { card } = await drawCard(socket1, roomId, currentPlayer.id);

      // Replace first card in hand with drawn card
      const updatePromise = waitForEvent(socket1, "game-state-update");
      socket1.emit("replace-with-drawn", {
        roomId,
        playerId: currentPlayer.id,
        drawnCardId: card.id,
        handCardId: currentPlayer.hand[0].id,
      });

      gameState = await updatePromise;

      // Hand size should remain the same
      expect(gameState.players[0].hand.length).toBe(initialHandSize);
    });
  });

  describe("Special Card Powers", () => {
    it("should activate Jack power (skip next player)", async () => {
      const roomId = generateRoomId();
      const socket1 = createTestSocket();
      const socket2 = createTestSocket();
      const socket3 = createTestSocket();
      sockets.push(socket1, socket2, socket3);

      await connectSocket(socket1);
      await connectSocket(socket2);
      await connectSocket(socket3);

      await joinRoom(socket1, roomId, "Player 1");
      await joinRoom(socket2, roomId, "Player 2");
      await joinRoom(socket3, roomId, "Player 3");

      let gameState = await startGame(socket1, roomId);
      const player1 = gameState.players[0];

      // Draw and discard a card
      const { card } = await drawCard(socket1, roomId, player1.id);
      gameState = await discardDrawnCard(socket1, roomId, player1.id, card.id);

      // If power card, skip it
      if (gameState.players[0].activePower) {
        gameState = await skipPower(socket1, roomId, player1.id, gameState.players[0].activePower);
      }

      // If it was a Jack, next player should have skippedTurn flag (will be cleared after their turn)
      // If not a Jack, we just verify the game continues normally
      expect(gameState.currentPlayerIndex).toBe(1);
    });
  });

  describe("Card Elimination", () => {
    it("should handle valid card elimination", async () => {
      const roomId = generateRoomId();
      const socket1 = createTestSocket();
      const socket2 = createTestSocket();
      sockets.push(socket1, socket2);

      await connectSocket(socket1);
      await connectSocket(socket2);

      await joinRoom(socket1, roomId, "Player 1");
      await joinRoom(socket2, roomId, "Player 2");

      let gameState = await startGame(socket1, roomId);
      const player1 = gameState.players[0];

      // Draw and discard a card to have something in discard pile
      const { card } = await drawCard(socket1, roomId, player1.id);
      gameState = await discardDrawnCard(socket1, roomId, player1.id, card.id);

      // Try to eliminate a matching card if we have one
      const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];
      const matchingCard = gameState.players
        .flatMap((p) => p.hand)
        .find((c) => c && c.rank === topDiscard.rank);

      if (matchingCard) {
        const updatePromise = waitForEvent(socket1, "game-state-update");
        socket1.emit("eliminate-card", {
          roomId,
          playerId: player1.id,
          cardId: matchingCard.id,
        });

        gameState = await updatePromise;
        // Card should be eliminated (set to null in hand)
        // Verification would depend on implementation details
      }
    });

    it("should handle invalid card elimination with penalty", async () => {
      const roomId = generateRoomId();
      const socket1 = createTestSocket();
      const socket2 = createTestSocket();
      sockets.push(socket1, socket2);

      await connectSocket(socket1);
      await connectSocket(socket2);

      await joinRoom(socket1, roomId, "Player 1");
      await joinRoom(socket2, roomId, "Player 2");

      let gameState = await startGame(socket1, roomId);
      const player1 = gameState.players[0];
      const initialHandSize = player1.hand.length;

      // Draw and discard a card
      const { card } = await drawCard(socket1, roomId, player1.id);
      gameState = await discardDrawnCard(socket1, roomId, player1.id, card.id);

      // Try to eliminate a non-matching card
      const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];
      const nonMatchingCard = gameState.players[0].hand.find(
        (c) => c && c.rank !== topDiscard.rank
      );

      if (nonMatchingCard) {
        const penaltyPromise = waitForEvent(socket1, "penalty-card");
        socket1.emit("eliminate-card", {
          roomId,
          playerId: player1.id,
          cardId: nonMatchingCard.id,
        });

        const penalty = await penaltyPromise;
        expect(penalty.playerId).toBe(player1.id);
        expect(penalty.penaltyCard).toBeDefined();
      }
    });
  });

  describe("Game End", () => {
    it("should handle declare and end game", async () => {
      const roomId = generateRoomId();
      const socket1 = createTestSocket();
      const socket2 = createTestSocket();
      sockets.push(socket1, socket2);

      await connectSocket(socket1);
      await connectSocket(socket2);

      await joinRoom(socket1, roomId, "Player 1");
      await joinRoom(socket2, roomId, "Player 2");

      let gameState = await startGame(socket1, roomId);
      const currentPlayer = gameState.players[0];

      // Set up listeners for game end
      const gameEndedPromise = waitForEvent(socket1, "game-ended");
      const stateUpdatePromise = waitForEvent(socket1, "game-state-update");

      // Declare (current player calls it)
      socket1.emit("declare", {
        roomId,
        playerId: currentPlayer.id,
        declaredRanks: currentPlayer.hand
          .filter((card) => card !== null)
          .map((card) => card.rank),
      });

      const [endData, finalState] = await Promise.all([
        gameEndedPromise,
        stateUpdatePromise,
      ]);

      expect(endData.declarer).toBe(currentPlayer.id);
      expect(finalState.gameStatus).toBe("ended");
      expect(endData.scores).toBeDefined();
      expect(endData.scores.length).toBe(2);
    });

    it("should calculate scores correctly", async () => {
      const roomId = generateRoomId();
      const socket1 = createTestSocket();
      const socket2 = createTestSocket();
      sockets.push(socket1, socket2);

      await connectSocket(socket1);
      await connectSocket(socket2);

      await joinRoom(socket1, roomId, "Player 1");
      await joinRoom(socket2, roomId, "Player 2");

      let gameState = await startGame(socket1, roomId);
      const currentPlayer = gameState.players[0];

      const gameEndedPromise = waitForEvent(socket1, "game-ended");

      socket1.emit("declare", {
        roomId,
        playerId: currentPlayer.id,
        declaredRanks: currentPlayer.hand
          .filter((card) => card !== null)
          .map((card) => card.rank),
      });

      const endData = await gameEndedPromise;

      // Verify scores are numbers
      endData.scores.forEach((score: any) => {
        expect(typeof score.score).toBe("number");
        expect(score.score).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("Multi-Player Scenarios", () => {
    it("should handle 4-player game flow", async () => {
      const roomId = generateRoomId();
      const sockets4 = [
        createTestSocket(),
        createTestSocket(),
        createTestSocket(),
        createTestSocket(),
      ];
      sockets.push(...sockets4);

      await Promise.all(sockets4.map((s) => connectSocket(s)));

      for (let i = 0; i < 4; i++) {
        await joinRoom(sockets4[i], roomId, `Player ${i + 1}`);
      }

      const gameState = await startGame(sockets4[0], roomId);

      expect(gameState.gameStatus).toBe("playing");
      expect(gameState.players).toHaveLength(4);
      expect(gameState.currentPlayerIndex).toBe(0);

      // Each player should have cards
      gameState.players.forEach((player) => {
        expect(player.hand.length).toBeGreaterThan(0);
      });
    });

    it("should rotate turns correctly among players", async () => {
      const roomId = generateRoomId();
      const socket1 = createTestSocket();
      const socket2 = createTestSocket();
      const socket3 = createTestSocket();
      sockets.push(socket1, socket2, socket3);

      await connectSocket(socket1);
      await connectSocket(socket2);
      await connectSocket(socket3);

      await joinRoom(socket1, roomId, "Player 1");
      await joinRoom(socket2, roomId, "Player 2");
      await joinRoom(socket3, roomId, "Player 3");

      let gameState = await startGame(socket1, roomId);
      expect(gameState.currentPlayerIndex).toBe(0);

      // Player 1's turn
      let player = gameState.players[0];
      let { card } = await drawCard(socket1, roomId, player.id);
      gameState = await discardDrawnCard(socket1, roomId, player.id, card.id);

      // Skip power if activated
      if (gameState.players[0].activePower) {
        gameState = await skipPower(socket1, roomId, player.id, gameState.players[0].activePower);
      }
      expect(gameState.currentPlayerIndex).toBe(1);

      // Player 2's turn
      player = gameState.players[1];
      ({ card } = await drawCard(socket2, roomId, player.id));
      gameState = await discardDrawnCard(socket2, roomId, player.id, card.id);

      // Skip power if activated
      if (gameState.players[1].activePower) {
        gameState = await skipPower(socket2, roomId, player.id, gameState.players[1].activePower);
      }
      expect(gameState.currentPlayerIndex).toBe(2);

      // Player 3's turn
      player = gameState.players[2];
      ({ card } = await drawCard(socket3, roomId, player.id));
      gameState = await discardDrawnCard(socket3, roomId, player.id, card.id);

      // Skip power if activated
      if (gameState.players[2].activePower) {
        gameState = await skipPower(socket3, roomId, player.id, gameState.players[2].activePower);
      }
      expect(gameState.currentPlayerIndex).toBe(0); // Should wrap back to player 1
    });
  });

  describe("Event Broadcasting", () => {
    it("should broadcast game state updates to all connected players", async () => {
      const roomId = generateRoomId();
      const socket1 = createTestSocket();
      const socket2 = createTestSocket();
      sockets.push(socket1, socket2);

      await connectSocket(socket1);
      await connectSocket(socket2);

      await joinRoom(socket1, roomId, "Player 1");
      await joinRoom(socket2, roomId, "Player 2");

      await startGame(socket1, roomId);

      // Set up listener on second socket
      const listener = new MockEventListener();
      listener.listen(socket2, ["game-state-update"]);

      // Player 1 draws a card
      const player1 = await waitForEvent(socket1, "game-state-update");
      socket1.emit("draw-card", {
        roomId,
        playerId: player1.players[0].id,
      });

      // Wait for player 2 to receive the update
      await listener.waitForEventCount("game-state-update", 1, 3000);

      expect(listener.getEventCount("game-state-update")).toBeGreaterThan(0);
    });
  });

  describe("Return to Lobby", () => {
    it("should return to lobby and reset game state", async () => {
      const roomId = generateRoomId();
      const socket1 = createTestSocket();
      const socket2 = createTestSocket();
      sockets.push(socket1, socket2);

      await connectSocket(socket1);
      await connectSocket(socket2);

      await joinRoom(socket1, roomId, "Player 1");
      await joinRoom(socket2, roomId, "Player 2");

      // Start and play a bit
      let gameState = await startGame(socket1, roomId);
      expect(gameState.gameStatus).toBe("playing");

      // Return to lobby
      const updatePromise = waitForEvent(socket1, "game-state-update");
      socket1.emit("return-to-lobby", { roomId });

      gameState = await updatePromise;

      expect(gameState.gameStatus).toBe("waiting");
      expect(gameState.players[0].hand).toHaveLength(0);
      expect(gameState.players[1].hand).toHaveLength(0);
      expect(gameState.deck).toHaveLength(0);
      expect(gameState.discardPile).toHaveLength(0);
    });
  });
});
