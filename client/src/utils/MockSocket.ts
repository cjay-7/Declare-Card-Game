// client/src/utils/MockSocket.ts
import { EventEmitter } from "events";
import {
  createDeck,
  shuffleDeck,
  dealCards,
  revealInitialCards,
} from "./cardUtils";
import type { Card } from "./cardUtils";
import type { GameState, Player } from "./gameLogic";

class MockSocket extends EventEmitter {
  private static instance: MockSocket;
  private connected = true;
  private id = `mock-${Math.random().toString(36).substring(2, 9)}`;
  private rooms: Record<string, GameState> = {};
  private playersByRoom: Record<string, Player[]> = {};

  constructor() {
    super();
    console.log("MockSocket initialized with ID:", this.id);
  }

  // Create a singleton instance
  public static getInstance(): MockSocket {
    if (!MockSocket.instance) {
      MockSocket.instance = new MockSocket();
    }
    return MockSocket.instance;
  }

  getId(): string {
    return this.id;
  }

  // For test purposes - allows us to force a specific ID
  setId(id: string): void {
    this.id = id;
    console.log("MockSocket ID set to:", this.id);
  }

  emit(event: string, data: any): this {
    console.log(`[${this.id}] Mock emitting: ${event}`, data);

    // Special case for emit to server
    if (
      event === "join-room" ||
      event === "leave-room" ||
      event === "start-game" ||
      event === "draw-card" ||
      event === "discard-card" ||
      event === "swap-card" ||
      event === "declare" ||
      event === "view-opponent-card" ||
      event === "view-own-card"
    ) {
      this.handleClientEvents(event, data);
      return this;
    }

    // This is an "emit to client" that would normally come from server
    // Let's broadcast it to all instances
    setTimeout(() => {
      this.emitToAll(event, data);
    }, 10);

    return this;
  }

  // Broadcast to all sockets
  private emitToAll(event: string, data: any): void {
    super.emit(event, data);
  }

  on(event: string, listener: (...args: any[]) => void): this {
    console.log(`[${this.id}] Mock registering listener for: ${event}`);
    return super.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): this {
    console.log(`[${this.id}] Mock removing listener for: ${event}`);
    return super.off(event, listener);
  }

  private handleClientEvents(event: string, data: any): void {
    console.log(`[${this.id}] Handling event: ${event}`, data);
    switch (event) {
      case "join-room":
        this.handleJoinRoom(data);
        break;
      case "leave-room":
        this.handleLeaveRoom(data);
        break;
      case "start-game":
        this.handleStartGame(data);
        break;
      case "draw-card":
        this.handleDrawCard(data);
        break;
      case "discard-card":
        this.handleDiscardCard(data);
        break;
      case "swap-card":
        this.handleSwapCard(data);
        break;
      case "declare":
        this.handleDeclare(data);
        break;
      case "view-opponent-card":
        this.handleViewOpponentCard(data);
        break;
      case "view-own-card":
        this.handleViewOwnCard(data);
        break;
      default:
        console.log(`Unhandled mock event: ${event}`);
    }
  }

  private handleJoinRoom({
    roomId,
    playerName,
  }: {
    roomId: string;
    playerName: string;
  }): void {
    console.log(
      `[${this.id}] Handling join room. Room: ${roomId}, Player: ${playerName}`
    );

    if (!this.rooms[roomId]) {
      // Create new room
      this.rooms[roomId] = {
        players: [],
        currentPlayerIndex: 0,
        deck: [],
        discardPile: [],
        gameStatus: "waiting",
        matchingDiscardWindow: false,
        matchingDiscardCard: null,
        matchingDiscardTimeout: null,
        roundNumber: 1,
        declarer: null,
        lastAction: null,
      };
      this.playersByRoom[roomId] = [];
    }

    // Check if player with this socket ID already exists
    const existingPlayerIndex = this.rooms[roomId].players.findIndex(
      (p) => p.id === this.id
    );

    if (existingPlayerIndex >= 0) {
      console.log(
        `Player with ID ${this.id} already in room, updating name to ${playerName}`
      );
      this.rooms[roomId].players[existingPlayerIndex].name = playerName;
    } else {
      // Add player to the room
      const isHost = this.rooms[roomId].players.length === 0;
      const newPlayer: Player = {
        id: this.id,
        name: playerName,
        isHost,
        hand: [],
        score: 0,
        knownCards: [],
        skippedTurn: false,
      };

      console.log(`Adding new player to room ${roomId}:`, newPlayer);
      this.rooms[roomId].players.push(newPlayer);
      this.playersByRoom[roomId].push(newPlayer);
    }

    // Send updated game state to all connected clients
    this.emitToAll("game-state-update", this.rooms[roomId]);
  }

  private handleLeaveRoom({
    roomId,
    playerId,
  }: {
    roomId: string;
    playerId: string;
  }): void {
    if (!this.rooms[roomId]) return;

    // Remove player from the room
    this.rooms[roomId].players = this.rooms[roomId].players.filter(
      (player) => player.id !== playerId
    );
    this.playersByRoom[roomId] = this.playersByRoom[roomId].filter(
      (player) => player.id !== playerId
    );

    // If room is empty, remove it
    if (this.rooms[roomId].players.length === 0) {
      delete this.rooms[roomId];
      delete this.playersByRoom[roomId];
    } else {
      // If the host left, assign a new host
      if (!this.rooms[roomId].players.some((player) => player.isHost)) {
        this.rooms[roomId].players[0].isHost = true;
      }

      // Send updated game state to all connected clients
      this.emitToAll("game-state-update", this.rooms[roomId]);
    }
  }

  private handleStartGame({ roomId }: { roomId: string }): void {
    console.log(`[${this.id}] Start game requested for room ${roomId}`);

    if (!this.rooms[roomId]) {
      console.error(`No room found with ID ${roomId}`);
      return;
    }

    const gameState = this.rooms[roomId];
    const playerCount = gameState.players.length;

    console.log(`Starting game with ${playerCount} players`);

    // Force at least 2 players for testing
    if (playerCount < 2) {
      // Add a bot player if needed
      const botPlayer: Player = {
        id: `bot-${Math.random().toString(36).substring(2, 9)}`,
        name: "Bot Player",
        isHost: false,
        hand: [],
        score: 0,
        knownCards: [],
        skippedTurn: false,
      };

      gameState.players.push(botPlayer);
      console.log("Added bot player to make minimum 2 players");
    }

    // Create and shuffle the deck
    const deck = shuffleDeck(createDeck());

    // Deal cards to players
    const { playerHands, remainingDeck } = dealCards(
      deck,
      gameState.players.length
    );

    // Update game state
    gameState.deck = remainingDeck;
    gameState.gameStatus = "playing";
    gameState.currentPlayerIndex = 0;

    // Assign hands to players and reveal initial cards
    gameState.players.forEach((player, index) => {
      player.hand = revealInitialCards(playerHands[index]);
    });

    // Update game state
    this.rooms[roomId] = gameState;

    // Send updated game state to all connected clients
    this.emitToAll("game-state-update", this.rooms[roomId]);
  }

  private handleDrawCard({
    roomId,
    playerId,
  }: {
    roomId: string;
    playerId: string;
  }): void {
    if (!this.rooms[roomId]) return;

    const gameState = this.rooms[roomId];

    // Check if it's player's turn
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      console.log(
        `Not ${playerId}'s turn, current player is ${currentPlayer.id}`
      );
      return;
    }

    // Draw a card from the deck
    if (gameState.deck.length > 0) {
      const drawnCard = gameState.deck.pop()!;
      drawnCard.isRevealed = true;

      // Send the drawn card to the player
      if (playerId === this.id) {
        this.emit("card-drawn", drawnCard);
      } else {
        // This is a broadcast to all, for test purposes
        this.emitToAll("card-drawn", {
          playerId,
          card: drawnCard,
        });
      }

      // Update game state
      this.rooms[roomId] = gameState;
      this.emitToAll("game-state-update", this.rooms[roomId]);
    }
  }

  private handleDiscardCard({
    roomId,
    playerId,
    cardId,
  }: {
    roomId: string;
    playerId: string;
    cardId: string;
  }): void {
    if (!this.rooms[roomId]) return;

    const gameState = this.rooms[roomId];

    // Check if it's player's turn
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return;

    // Find the card in player's hand
    const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
    const cardIndex = gameState.players[playerIndex].hand.findIndex(
      (c) => c.id === cardId
    );

    if (cardIndex !== -1) {
      // Remove card from hand and add to discard pile
      const card = gameState.players[playerIndex].hand.splice(cardIndex, 1)[0];
      gameState.discardPile.push(card);

      // Move to next player
      gameState.currentPlayerIndex =
        (gameState.currentPlayerIndex + 1) % gameState.players.length;

      // Update game state
      this.rooms[roomId] = gameState;
      this.emitToAll("game-state-update", this.rooms[roomId]);
    }
  }

  private handleSwapCard({
    roomId,
    playerId,
    cardId,
    targetPlayerId,
  }: {
    roomId: string;
    playerId: string;
    cardId: string;
    targetPlayerId: string;
  }): void {
    if (!this.rooms[roomId]) return;

    const gameState = this.rooms[roomId];

    // Check if it's player's turn
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return;

    // Find the cards
    const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
    const targetPlayerIndex = gameState.players.findIndex(
      (p) => p.id === targetPlayerId
    );
    const cardIndex = gameState.players[playerIndex].hand.findIndex(
      (c) => c.id === cardId
    );

    if (playerIndex !== -1 && targetPlayerIndex !== -1 && cardIndex !== -1) {
      // For simplicity in mock, just swap with first card of target player
      const targetCardIndex = 0;

      // Swap the cards
      const playerCard = gameState.players[playerIndex].hand[cardIndex];
      const targetCard =
        gameState.players[targetPlayerIndex].hand[targetCardIndex];

      gameState.players[playerIndex].hand[cardIndex] = targetCard;
      gameState.players[targetPlayerIndex].hand[targetCardIndex] = playerCard;

      // Move to next player
      gameState.currentPlayerIndex =
        (gameState.currentPlayerIndex + 1) % gameState.players.length;

      // Update game state
      this.rooms[roomId] = gameState;
      this.emitToAll("game-state-update", this.rooms[roomId]);
    }
  }

  private handleDeclare({
    roomId,
    playerId,
  }: {
    roomId: string;
    playerId: string;
  }): void {
    if (!this.rooms[roomId]) return;

    const gameState = this.rooms[roomId];

    // Check if it's player's turn
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return;

    // Mark game as ended and set declarer
    gameState.gameStatus = "ended";
    gameState.declarer = playerId;

    // For mock purposes, declare always succeeds
    // In real game, you'd check if the hand forms a valid set/sequence

    // Reveal all player cards
    gameState.players.forEach((player) => {
      player.hand.forEach((card) => {
        card.isRevealed = true;
      });
    });

    // Update game state
    this.rooms[roomId] = gameState;
    this.emitToAll("game-state-update", this.rooms[roomId]);
    this.emitToAll("game-ended", {
      winner: playerId,
      score: 100, // Mock score
    });
  }

  private handleViewOpponentCard({
    roomId,
    playerId,
    targetPlayerId,
    cardIndex,
  }: {
    roomId: string;
    playerId: string;
    targetPlayerId: string;
    cardIndex: number;
  }): void {
    if (!this.rooms[roomId]) return;

    const gameState = this.rooms[roomId];

    // Check if it's player's turn
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return;

    // Find the target player
    const targetPlayerIndex = gameState.players.findIndex(
      (p) => p.id === targetPlayerId
    );

    if (
      targetPlayerIndex !== -1 &&
      gameState.players[targetPlayerIndex].hand[cardIndex]
    ) {
      // Reveal the card temporarily
      const card = gameState.players[targetPlayerIndex].hand[cardIndex];
      card.isRevealed = true;

      // Add to known cards
      if (
        !gameState.players
          .find((p) => p.id === playerId)
          ?.knownCards.includes(card.id)
      ) {
        gameState.players
          .find((p) => p.id === playerId)
          ?.knownCards.push(card.id);
      }

      // Update game state
      this.rooms[roomId] = gameState;
      this.emitToAll("game-state-update", this.rooms[roomId]);

      // Hide the card again after 3 seconds
      setTimeout(() => {
        if (this.rooms[roomId]) {
          card.isRevealed = false;
          this.emitToAll("game-state-update", this.rooms[roomId]);
        }
      }, 3000);
    }
  }

  private handleViewOwnCard({
    roomId,
    playerId,
    cardIndex,
  }: {
    roomId: string;
    playerId: string;
    cardIndex: number;
  }): void {
    if (!this.rooms[roomId]) return;

    const gameState = this.rooms[roomId];

    // Check if it's player's turn
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return;

    // Find the player
    const playerIndex = gameState.players.findIndex((p) => p.id === playerId);

    if (playerIndex !== -1 && gameState.players[playerIndex].hand[cardIndex]) {
      // Reveal the card permanently
      gameState.players[playerIndex].hand[cardIndex].isRevealed = true;

      // Update game state
      this.rooms[roomId] = gameState;
      this.emitToAll("game-state-update", this.rooms[roomId]);
    }
  }
}

export default MockSocket;
