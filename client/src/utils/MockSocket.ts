// client/src/utils/MockSocket.ts
import { BrowserEventEmitter } from "./BrowserEventEmitter";
import {
  createDeck,
  shuffleDeck,
  dealCards,
  revealInitialCards,
} from "./cardUtils";
import type { Card } from "./cardUtils";
import type { GameState, Player } from "./gameLogic";

class MockSocket extends BrowserEventEmitter {
  private static instance: MockSocket;
  private connected = true;
  private id = `mock-${Math.random().toString(36).substring(2, 9)}`;
  private rooms: Record<string, GameState> = {};
  private playersByRoom: Record<string, Player[]> = {};
  private drawnCards: Record<string, Card> = {}; // Track drawn cards by player ID

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

  emit(event: string, data: any): boolean {
    console.log(`[${this.id}] Mock emitting: ${event}`, data);

    // Special case for emit to server
    if (
      event === "join-room" ||
      event === "leave-room" ||
      event === "start-game" ||
      event === "draw-card" ||
      event === "eliminate-card" ||
      event === "discard-drawn-card" ||
      event === "swap-drawn-card" ||
      event === "declare" ||
      event === "view-opponent-card" ||
      event === "view-own-card"
    ) {
      this.handleClientEvents(event, data);
      return true;
    }

    // This is an "emit to client" that would normally come from server
    // Let's broadcast it to all instances
    setTimeout(() => {
      this.emitToAll(event, data);
    }, 10);

    return true;
  }

  // Broadcast to all sockets
  private emitToAll(event: string, data: any): void {
    super.emit(event, data);
  }

  // Override the default on method to add logging
  on(event: string, listener: (...args: any[]) => void): this {
    console.log(`[${this.id}] Mock registering listener for: ${event}`);
    return super.on(event, listener);
  }

  // Override the default off method to add logging
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
      case "eliminate-card":
        this.handleEliminateCard(data);
        break;
      case "discard-drawn-card":
        this.handleDiscardDrawnCard(data);
        break;
      case "swap-drawn-card":
        this.handleSwapDrawnCard(data);
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
        type: "view",
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

    // Emit player joined event
    this.emitToAll("player-joined", { roomId, name: playerName, id: this.id });

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

    // Check if the requesting player is the host
    const requestingPlayer = gameState.players.find((p) => p.id === this.id);
    if (!requestingPlayer?.isHost) {
      console.log("Only host can start the game");
      this.emit("error", { message: "Only host can start the game" });
      return;
    }

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

    // Assign hands to players - all cards start hidden, but players will see their own bottom 2
    gameState.players.forEach((player, index) => {
      const hand = playerHands[index];
      // Set position for each card - all start hidden
      hand.forEach((card, cardIndex) => {
        card.position = cardIndex;
        card.isRevealed = false; // All cards start hidden in the game state
      });

      player.hand = hand;
      player.score = 0; // Reset scores
      player.knownCards = []; // Reset known cards
      player.skippedTurn = false; // Reset skip status
    });

    // Clear any stored drawn cards from previous games
    this.drawnCards = {};

    // Update game state
    this.rooms[roomId] = gameState;

    // Emit game started event
    this.emitToAll("start-game", { roomId });

    // Send updated game state to all connected clients
    this.emitToAll("game-state-update", this.rooms[roomId]);

    console.log(
      `Game successfully started in room ${roomId} with ${gameState.players.length} players`
    );
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

      // Store the drawn card for this player
      this.drawnCards[playerId] = drawnCard;

      // Create a last action record
      gameState.lastAction = {
        type: "draw",
        playerId,
        timestamp: Date.now(),
      };

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

  private handleEliminateCard({
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

    // Find the player and card
    const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
    const cardIndex = gameState.players[playerIndex].hand.findIndex(
      (c) => c.id === cardId
    );

    if (playerIndex !== -1 && cardIndex !== -1) {
      const cardToEliminate = gameState.players[playerIndex].hand[cardIndex];

      // Check if elimination is valid (matches top discard card rank)
      const topDiscardCard =
        gameState.discardPile.length > 0
          ? gameState.discardPile[gameState.discardPile.length - 1]
          : null;

      const canEliminate =
        !topDiscardCard || topDiscardCard.rank === cardToEliminate.rank;

      if (canEliminate) {
        // Valid elimination - remove card from hand and add to discard pile
        const eliminatedCard = gameState.players[playerIndex].hand.splice(
          cardIndex,
          1
        )[0];
        gameState.discardPile.push(eliminatedCard);

        console.log("Card eliminated successfully:", eliminatedCard.rank);

        // Move to next player after successful elimination
        gameState.currentPlayerIndex =
          (gameState.currentPlayerIndex + 1) % gameState.players.length;
      } else {
        // Invalid elimination - card stays in hand (face down) and give penalty card
        console.log(
          "Invalid elimination - card returned face down + penalty card"
        );

        // Make the attempted card face down
        cardToEliminate.isRevealed = false;

        // Give penalty card if deck has cards
        if (gameState.deck.length > 0) {
          const penaltyCard = gameState.deck.pop()!;
          penaltyCard.isRevealed = false; // Penalty card is face down
          gameState.players[playerIndex].hand.push(penaltyCard);

          this.emitToAll("penalty-card", {
            playerId,
            penaltyCard,
            reason: "Invalid elimination attempt",
          });
        }

        // Move to next player even after failed elimination
        gameState.currentPlayerIndex =
          (gameState.currentPlayerIndex + 1) % gameState.players.length;
      }

      // Create a last action record
      gameState.lastAction = {
        type: "discard", // Use "discard" instead of "eliminate" for now
        playerId,
        cardId,
        timestamp: Date.now(),
      };

      // Update game state
      this.rooms[roomId] = gameState;
      this.emitToAll("game-state-update", this.rooms[roomId]);
    }
  }

  private handleDiscardDrawnCard({
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

    // Get the actual drawn card for this player
    const drawnCard = this.drawnCards[playerId];
    if (!drawnCard) {
      console.error("No drawn card found for player:", playerId);
      return;
    }

    // Verify the card ID matches (optional safety check)
    if (drawnCard.id !== cardId) {
      console.warn("Card ID mismatch - using stored drawn card anyway");
    }

    // Add the actual drawn card to discard pile
    gameState.discardPile.push(drawnCard);
    console.log(`Discarded ${drawnCard.rank} of ${drawnCard.suit}`);

    // Apply special card powers
    if (drawnCard.rank === "J") {
      // Jack: Skip the next player's turn
      const nextPlayerIndex =
        (gameState.currentPlayerIndex + 1) % gameState.players.length;
      gameState.players[nextPlayerIndex].skippedTurn = true;
      console.log("Jack played - next player's turn skipped");
    }

    // Clear the drawn card from storage
    delete this.drawnCards[playerId];

    // Create a last action record
    gameState.lastAction = {
      type: "discard",
      playerId,
      cardId,
      timestamp: Date.now(),
    };

    // Move to next player
    gameState.currentPlayerIndex =
      (gameState.currentPlayerIndex + 1) % gameState.players.length;

    // Update game state
    this.rooms[roomId] = gameState;
    this.emitToAll("game-state-update", this.rooms[roomId]);
  }

  private handleSwapDrawnCard({
    roomId,
    playerId,
    drawnCardId,
    handCardId,
  }: {
    roomId: string;
    playerId: string;
    drawnCardId: string;
    handCardId: string;
  }): void {
    if (!this.rooms[roomId]) return;

    const gameState = this.rooms[roomId];

    // Check if it's player's turn
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return;

    // Find the player and the card in their hand
    const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
    const cardIndex = gameState.players[playerIndex].hand.findIndex(
      (c) => c.id === handCardId
    );

    if (playerIndex !== -1 && cardIndex !== -1) {
      // Get the actual drawn card for this player
      const drawnCard = this.drawnCards[playerId];
      if (!drawnCard) {
        console.error("No drawn card found for player:", playerId);
        return;
      }

      // Get the hand card that will be discarded
      const handCard = gameState.players[playerIndex].hand[cardIndex];

      // Put the drawn card into the hand position (face down)
      drawnCard.isRevealed = false; // Make it face down when it goes into hand
      gameState.players[playerIndex].hand[cardIndex] = drawnCard;

      // Put the hand card into the discard pile
      gameState.discardPile.push(handCard);

      // Clear the drawn card from storage
      delete this.drawnCards[playerId];

      console.log(
        `Swapped: drawn card ${drawnCard.rank} → hand (face down), hand card ${handCard.rank} → discard pile`
      );

      // Create a last action record
      gameState.lastAction = {
        type: "swap",
        playerId,
        cardId: handCardId,
        timestamp: Date.now(),
      };

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
    declaredRanks,
  }: {
    roomId: string;
    playerId: string;
    declaredRanks: string[];
  }): void {
    if (!this.rooms[roomId]) return;

    const gameState = this.rooms[roomId];

    // Check if it's player's turn
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return;

    // Find the player
    const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return;

    // For testing, we'll validate the declaration (simplified)
    const actualRanks = gameState.players[playerIndex].hand.map(
      (card) => card.rank
    );
    const isValidDeclaration = declaredRanks.every(
      (rank, index) => actualRanks[index] === rank
    );

    console.log("Declared ranks:", declaredRanks);
    console.log("Actual ranks:", actualRanks);
    console.log("Is valid:", isValidDeclaration);

    // Mark game as ended and set declarer
    gameState.gameStatus = "ended";
    gameState.declarer = playerId;

    // Create a last action record
    gameState.lastAction = {
      type: "declare",
      playerId,
      timestamp: Date.now(),
    };

    // Calculate scores
    gameState.players.forEach((player) => {
      // Reveal all cards
      player.hand.forEach((card) => {
        card.isRevealed = true;
      });

      // Calculate score - use actual card values for realism
      player.score = player.hand.reduce((sum, card) => sum + card.value, 0);
    });

    // If declaration was invalid, add penalty to declarer
    if (!isValidDeclaration) {
      gameState.players[playerIndex].score += 20; // Penalty for wrong declaration
    }

    // Find winner(s) - lowest score wins
    const minScore = Math.min(...gameState.players.map((p) => p.score));
    const winners = gameState.players
      .filter((p) => p.score === minScore)
      .map((p) => ({ id: p.id, name: p.name, score: p.score }));

    // Update game state
    this.rooms[roomId] = gameState;
    this.emitToAll("game-state-update", this.rooms[roomId]);
    this.emitToAll("game-ended", {
      declarer: playerId,
      winners,
      isValidDeclaration,
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

      // Create a last action record
      gameState.lastAction = {
        type: "view",
        playerId,
        targetPlayerId,
        targetCardIndex: cardIndex,
        timestamp: Date.now(),
      };

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

      // Send card revealed event to the player who used King
      this.emit("card-revealed", {
        playerId: targetPlayerId,
        cardIndex,
        card,
      });

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

    // Find the player
    const playerIndex = gameState.players.findIndex((p) => p.id === playerId);

    if (playerIndex !== -1 && gameState.players[playerIndex].hand[cardIndex]) {
      // Reveal the card permanently
      const card = gameState.players[playerIndex].hand[cardIndex];
      card.isRevealed = true;

      // Create a last action record
      gameState.lastAction = {
        type: "view",
        playerId,
        targetCardIndex: cardIndex,
        timestamp: Date.now(),
      };

      // Add to known cards
      if (!gameState.players[playerIndex].knownCards.includes(card.id)) {
        gameState.players[playerIndex].knownCards.push(card.id);
      }

      // Send card revealed event to the player who revealed the card
      this.emit("card-revealed", {
        playerId,
        cardIndex,
        card,
      });

      // Update game state
      this.rooms[roomId] = gameState;
      this.emitToAll("game-state-update", this.rooms[roomId]);
    }
  }
}

export default MockSocket;
