/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// client/src/utils/MockSocket.ts - Updated with fixed card elimination preserving positions
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

  public static getInstance(): MockSocket {
    if (!MockSocket.instance) {
      MockSocket.instance = new MockSocket();
    }
    return MockSocket.instance;
  }

  private moveToNextPlayer(gameState: GameState): void {
    if (!gameState.players.length) return;

    console.log(
      `[TURN DEBUG] Current player before move: ${
        gameState.players[gameState.currentPlayerIndex].name
      } (index ${gameState.currentPlayerIndex})`
    );

    let nextPlayerIndex =
      (gameState.currentPlayerIndex + 1) % gameState.players.length;

    // Keep advancing until we find a player who isn't skipped
    let attempts = 0;
    while (
      gameState.players[nextPlayerIndex]?.skippedTurn &&
      attempts < gameState.players.length
    ) {
      console.log(
        `[TURN DEBUG] Player ${gameState.players[nextPlayerIndex].name} turn skipped - advancing further`
      );
      // Reset the skip flag
      gameState.players[nextPlayerIndex].skippedTurn = false;
      // Move to next player
      nextPlayerIndex = (nextPlayerIndex + 1) % gameState.players.length;
      attempts++;
    }

    gameState.currentPlayerIndex = nextPlayerIndex;
    console.log(
      `[TURN DEBUG] Final turn assignment: ${gameState.players[nextPlayerIndex].name} (index ${nextPlayerIndex})`
    );
  }

  getId(): string {
    return this.id;
  }

  setId(id: string): void {
    this.id = id;
    console.log("MockSocket ID set to:", this.id);
  }

  emit(event: string, data: any): boolean {
    console.log(`[${this.id}] Mock emitting: ${event}`, data);

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
      event === "view-own-card" ||
      event === "use-power-on-own-card" ||
      event === "use-power-on-opponent-card" ||
      event === "use-power-swap" ||
      event === "give-card"
    ) {
      this.handleClientEvents(event, data);
      return true;
    }

    setTimeout(() => {
      this.emitToAll(event, data);
    }, 10);

    return true;
  }

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
      case "use-power-on-own-card":
        this.handleUsePowerOnOwnCard(data);
        break;
      case "use-power-on-opponent-card":
        this.handleUsePowerOnOpponentCard(data);
        break;
      case "use-power-swap":
        this.handleUsePowerSwap(data);
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

    const existingPlayerIndex = this.rooms[roomId].players.findIndex(
      (p) => p.id === this.id
    );

    if (existingPlayerIndex >= 0) {
      console.log(
        `Player with ID ${this.id} already in room, updating name to ${playerName}`
      );
      this.rooms[roomId].players[existingPlayerIndex].name = playerName;
    } else {
      const isHost = this.rooms[roomId].players.length === 0;
      const newPlayer: Player = {
        id: this.id,
        name: playerName,
        isHost,
        hand: [],
        score: 0,
        knownCards: [],
        skippedTurn: false,
        hasEliminatedThisRound: false,
      };

      console.log(`Adding new player to room ${roomId}:`, newPlayer);
      this.rooms[roomId].players.push(newPlayer);
      this.playersByRoom[roomId].push(newPlayer);
    }

    this.emitToAll("player-joined", { roomId, name: playerName, id: this.id });
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

    this.rooms[roomId].players = this.rooms[roomId].players.filter(
      (player) => player.id !== playerId
    );
    this.playersByRoom[roomId] = this.playersByRoom[roomId].filter(
      (player) => player.id !== playerId
    );

    if (this.rooms[roomId].players.length === 0) {
      delete this.rooms[roomId];
      delete this.playersByRoom[roomId];
    } else {
      if (!this.rooms[roomId].players.some((player) => player.isHost)) {
        this.rooms[roomId].players[0].isHost = true;
      }
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

    const requestingPlayer = gameState.players.find((p) => p.id === this.id);
    if (!requestingPlayer?.isHost) {
      console.log("Only host can start the game");
      this.emit("error", { message: "Only host can start the game" });
      return;
    }

    console.log(`Starting game with ${playerCount} players`);

    if (playerCount < 2) {
      const botPlayer: Player = {
        id: `bot-${Math.random().toString(36).substring(2, 9)}`,
        name: "Bot Player",
        isHost: false,
        hand: [],
        score: 0,
        knownCards: [],
        skippedTurn: false,
        hasEliminatedThisRound: false,
      };

      gameState.players.push(botPlayer);
      console.log("Added bot player to make minimum 2 players");
    }

    const deck = shuffleDeck(createDeck());
    const { playerHands, remainingDeck } = dealCards(
      deck,
      gameState.players.length
    );

    gameState.deck = remainingDeck;
    gameState.gameStatus = "playing";
    gameState.currentPlayerIndex = 0;

    gameState.players.forEach((player, index) => {
      const hand = playerHands[index];
      hand.forEach((card, cardIndex) => {
        card.position = cardIndex;
        card.isRevealed = false;
      });

      player.hand = hand;
      player.score = 0;
      player.knownCards = [];
      player.skippedTurn = false;
      player.hasEliminatedThisRound = false;
    });

    this.drawnCards = {};
    this.rooms[roomId] = gameState;

    this.emitToAll("start-game", { roomId });
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

      this.drawnCards[playerId] = drawnCard;

      gameState.lastAction = {
        type: "draw",
        playerId,
        timestamp: Date.now(),
      };

      if (playerId === this.id) {
        this.emit("card-drawn", drawnCard);
      } else {
        this.emitToAll("card-drawn", {
          playerId,
          card: drawnCard,
        });
      }

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

    // Find the player trying to eliminate
    const eliminatingPlayerIndex = gameState.players.findIndex(
      (p) => p.id === playerId
    );
    if (eliminatingPlayerIndex === -1) return;

    // Check if this player has already eliminated a card this round
    if (gameState.players[eliminatingPlayerIndex].hasEliminatedThisRound) {
      console.log("Player has already eliminated a card this round");
      return;
    }

    // Check if player is already in card-giving phase
    if (gameState.pendingCardGiving?.eliminatingPlayerId === playerId) {
      console.log("Player is already in card-giving phase");
      return;
    }

    // Find which player owns the card being eliminated
    let cardOwnerIndex = -1;
    let cardIndex = -1;
    let cardToEliminate = null;

    for (let i = 0; i < gameState.players.length; i++) {
      const foundCardIndex = gameState.players[i].hand.findIndex(
        (c) => c && c.id === cardId
      );
      if (foundCardIndex !== -1) {
        cardOwnerIndex = i;
        cardIndex = foundCardIndex;
        cardToEliminate = gameState.players[i].hand[foundCardIndex];
        break;
      }
    }

    if (cardOwnerIndex === -1 || cardIndex === -1 || !cardToEliminate) {
      console.log("Card not found in any player's hand");
      return;
    }

    // Check if elimination is valid (matches top discard card rank)
    const topDiscardCard =
      gameState.discardPile.length > 0
        ? gameState.discardPile[gameState.discardPile.length - 1]
        : null;

    const canEliminate =
      topDiscardCard && topDiscardCard.rank === cardToEliminate.rank;

    if (canEliminate) {
      // Valid elimination - Phase 1: Remove the card
      const eliminatedCard = gameState.players[cardOwnerIndex].hand[cardIndex];

      // Discard the eliminated card
      gameState.discardPile.push(eliminatedCard!);

      // Set the position to null temporarily
      gameState.players[cardOwnerIndex].hand[cardIndex] = null;

      // Check if eliminating player has any cards to give
      const eliminatingPlayerHand =
        gameState.players[eliminatingPlayerIndex].hand;
      const availableCards = eliminatingPlayerHand
        .map((card, index) => ({ card, index }))
        .filter(({ card }) => card !== null);

      if (availableCards.length === 0) {
        // Edge case: eliminating player has no cards to give
        console.log(
          `${gameState.players[eliminatingPlayerIndex].name} eliminated ${
            eliminatedCard!.rank
          } but has no cards to give`
        );

        // Mark as completed
        gameState.players[eliminatingPlayerIndex].hasEliminatedThisRound = true;

        gameState.lastAction = {
          type: "eliminate",
          playerId,
          cardId,
          timestamp: Date.now(),
        };
      } else {
        // Set up pending card giving phase
        gameState.pendingCardGiving = {
          eliminatingPlayerId: playerId,
          eliminatingPlayerIndex,
          cardOwnerIndex,
          cardIndex,
          eliminatedCard: eliminatedCard!,
          availableCards: availableCards.map(({ card, index }) => ({
            cardId: card!.id,
            cardIndex: index,
            card: card!,
          })),
        };

        console.log(
          `${gameState.players[eliminatingPlayerIndex].name} eliminated ${
            eliminatedCard!.rank
          } from ${
            gameState.players[cardOwnerIndex].name
          }'s hand. Now choosing card to give...`
        );

        // Emit event to show card selection UI to eliminating player
        this.emitToAll("elimination-card-selection", {
          eliminatingPlayerId: playerId,
          eliminatingPlayerName: gameState.players[eliminatingPlayerIndex].name,
          cardOwnerId: gameState.players[cardOwnerIndex].id,
          cardOwnerName: gameState.players[cardOwnerIndex].name,
          eliminatedCard: eliminatedCard,
          availableCards: gameState.pendingCardGiving.availableCards,
        });
      }

      // Reset elimination tracking for all other players
      gameState.players.forEach((player, idx) => {
        if (idx !== eliminatingPlayerIndex) {
          player.hasEliminatedThisRound = false;
        }
      });
    } else {
      // Invalid elimination - penalty for eliminating player
      console.log("Invalid elimination - penalty for eliminating player");

      if (gameState.deck.length > 0) {
        const penaltyCard = gameState.deck.pop()!;

        // Find first available slot for penalty card
        let slotFound = false;
        for (
          let i = 0;
          i < gameState.players[eliminatingPlayerIndex].hand.length;
          i++
        ) {
          if (gameState.players[eliminatingPlayerIndex].hand[i] === null) {
            penaltyCard.isRevealed = false;
            penaltyCard.position = i;
            gameState.players[eliminatingPlayerIndex].hand[i] = penaltyCard;
            slotFound = true;
            console.log(
              `Penalty card ${penaltyCard.rank} given to ${gameState.players[eliminatingPlayerIndex].name} at position ${i}`
            );
            break;
          }
        }

        if (!slotFound) {
          // All slots occupied, put penalty card back
          gameState.deck.push(penaltyCard);
          console.log("No empty slots for penalty card");
        }
      }

      gameState.lastAction = {
        type: "eliminate-failed",
        playerId,
        cardId,
        timestamp: Date.now(),
      };
    }

    this.rooms[roomId] = gameState;
    this.emitToAll("game-state-update", this.rooms[roomId]);
  }

  // Add this new method to MockSocket class
  private handleGiveCard({
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

    // Check if there's a pending card giving for this player
    if (
      !gameState.pendingCardGiving ||
      gameState.pendingCardGiving.eliminatingPlayerId !== playerId
    ) {
      console.log("No pending card giving for this player");
      return;
    }

    const {
      eliminatingPlayerIndex,
      cardOwnerIndex,
      cardIndex: eliminatedCardIndex,
      eliminatedCard,
      availableCards,
    } = gameState.pendingCardGiving;

    // Validate the selected card
    const selectedCardData = availableCards.find(
      (ac) => ac.cardIndex === cardIndex
    );
    if (!selectedCardData) {
      console.log("Invalid card selection for giving");
      return;
    }

    // Get the card to give
    const cardToGive =
      gameState.players[eliminatingPlayerIndex].hand[cardIndex];
    if (!cardToGive || cardToGive.id !== selectedCardData.cardId) {
      console.log("Card mismatch during giving");
      return;
    }

    // Transfer the card from eliminating player to opponent
    // Place the given card in the eliminated card's position
    gameState.players[cardOwnerIndex].hand[eliminatedCardIndex] = cardToGive;
    cardToGive.position = eliminatedCardIndex;

    // Replace the given card with null in eliminating player's hand
    gameState.players[eliminatingPlayerIndex].hand[cardIndex] = null;

    console.log(
      `${gameState.players[eliminatingPlayerIndex].name} gave ${cardToGive.rank} to ${gameState.players[cardOwnerIndex].name} at position ${eliminatedCardIndex}`
    );

    // Mark the eliminating player as having eliminated this round
    gameState.players[eliminatingPlayerIndex].hasEliminatedThisRound = true;

    // Clear the pending card giving
    delete gameState.pendingCardGiving;

    // Emit completion event
    this.emitToAll("elimination-card-transfer", {
      eliminatingPlayerId: playerId,
      eliminatingPlayerName: gameState.players[eliminatingPlayerIndex].name,
      cardOwnerId: gameState.players[cardOwnerIndex].id,
      cardOwnerName: gameState.players[cardOwnerIndex].name,
      eliminatedCard: eliminatedCard,
      givenCard: cardToGive,
      position: eliminatedCardIndex,
    });

    gameState.lastAction = {
      type: "give-card",
      playerId,
      cardId: cardToGive.id,
      timestamp: Date.now(),
    };

    this.rooms[roomId] = gameState;
    this.emitToAll("game-state-update", this.rooms[roomId]);
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

    // Add the actual drawn card to discard pile
    gameState.discardPile.push(drawnCard);
    console.log(`Discarded ${drawnCard.rank} of ${drawnCard.suit}`);

    // Reset elimination tracking for all players when new card is discarded
    gameState.players.forEach((player) => {
      player.hasEliminatedThisRound = false;
    });

    // Apply card powers ONLY when discarded directly from drawn card
    if (drawnCard.rank === "J") {
      // Jack: Skip the next player's turn
      const nextPlayerIndex =
        (gameState.currentPlayerIndex + 1) % gameState.players.length;
      gameState.players[nextPlayerIndex].skippedTurn = true;
      console.log(
        `[JACK POWER] Jack played by ${
          gameState.players[gameState.currentPlayerIndex].name
        }`
      );
      console.log(
        `[JACK POWER] Setting skippedTurn=true for ${gameState.players[nextPlayerIndex].name}`
      );
    }

    // Apply card powers for 7, 8, 9, 10, Q, K when discarded
    if (["7", "8", "9", "10", "Q", "K"].includes(drawnCard.rank)) {
      // Set power mode for the player who discarded
      const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
      if (playerIndex !== -1) {
        gameState.players[playerIndex].activePower = drawnCard.rank;
        console.log(
          `${drawnCard.rank} power activated for ${gameState.players[playerIndex].name}`
        );

        // Don't move to next player yet - wait for power to be used
        delete this.drawnCards[playerId];

        gameState.lastAction = {
          type: "discard",
          playerId,
          cardId,
          timestamp: Date.now(),
        };

        this.rooms[roomId] = gameState;
        this.emitToAll("game-state-update", this.rooms[roomId]);
        return; // Don't continue to move turns
      }
    }

    // Clear the drawn card from storage
    delete this.drawnCards[playerId];

    gameState.lastAction = {
      type: "discard",
      playerId,
      cardId,
      timestamp: Date.now(),
    };

    // Move to next player (with skip logic)
    this.moveToNextPlayer(gameState);

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
      (c) => c && c.id === handCardId // Check for null cards
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
      if (!handCard) {
        console.error("Hand card is null at position:", cardIndex);
        return;
      }

      // Put the drawn card into the hand position (face down) and preserve position
      drawnCard.isRevealed = false;
      drawnCard.position = cardIndex; // Preserve the position
      gameState.players[playerIndex].hand[cardIndex] = drawnCard;

      // Put the hand card into the discard pile
      gameState.discardPile.push(handCard);

      // Reset elimination tracking for all players when new card is discarded
      gameState.players.forEach((player) => {
        player.hasEliminatedThisRound = false;
      });

      // Clear the drawn card from storage
      delete this.drawnCards[playerId];

      console.log(
        `Swapped: drawn card ${drawnCard.rank} → hand position ${cardIndex} (face down), hand card ${handCard.rank} → discard pile`
      );

      gameState.lastAction = {
        type: "swap",
        playerId,
        cardId: handCardId,
        timestamp: Date.now(),
      };

      // Move to next player
      this.moveToNextPlayer(gameState);

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

    // For testing, we'll validate the declaration with null handling
    const actualRanks = gameState.players[playerIndex].hand.map((card) =>
      card ? card.rank : "ELIMINATED"
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

    gameState.lastAction = {
      type: "declare",
      playerId,
      timestamp: Date.now(),
    };

    // Calculate scores
    gameState.players.forEach((player) => {
      // Reveal all cards
      player.hand.forEach((card) => {
        if (card) {
          // Only reveal non-null cards
          card.isRevealed = true;
        }
      });

      // Calculate score - use actual card values, treating null as 0
      player.score = player.hand.reduce(
        (sum, card) => sum + (card ? card.value : 0),
        0
      );
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

    this.rooms[roomId] = gameState;
    this.emitToAll("game-state-update", this.rooms[roomId]);
    this.emitToAll("game-ended", {
      declarer: playerId,
      winners,
      isValidDeclaration,
    });
  }

  private handleUsePowerOnOwnCard({
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
    const playerIndex = gameState.players.findIndex((p) => p.id === playerId);

    if (playerIndex !== -1 && gameState.players[playerIndex].activePower) {
      const power = gameState.players[playerIndex].activePower;

      if (
        ["7", "8"].includes(power) &&
        gameState.players[playerIndex].hand[cardIndex] &&
        gameState.players[playerIndex].hand[cardIndex] !== null // Check not null
      ) {
        const card = gameState.players[playerIndex].hand[cardIndex];

        // Send the card info to the player
        this.emit("power-peek-result", {
          card,
          targetPlayer: `${gameState.players[playerIndex].name} (You)`,
          cardIndex,
        });

        // Add to known cards
        if (!gameState.players[playerIndex].knownCards.includes(card.id)) {
          gameState.players[playerIndex].knownCards.push(card.id);
        }

        console.log(
          `${power} power used: ${gameState.players[playerIndex].name} peeked at their own ${card.rank} of ${card.suit}`
        );

        // Clear the active power
        delete gameState.players[playerIndex].activePower;

        // Move to next player
        this.moveToNextPlayer(gameState);

        this.rooms[roomId] = gameState;
        this.emitToAll("game-state-update", this.rooms[roomId]);
      }
    }
  }

  private handleUsePowerOnOpponentCard({
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
    const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
    const targetPlayerIndex = gameState.players.findIndex(
      (p) => p.id === targetPlayerId
    );

    if (
      playerIndex !== -1 &&
      targetPlayerIndex !== -1 &&
      gameState.players[playerIndex].activePower
    ) {
      const power = gameState.players[playerIndex].activePower;

      if (
        ["9", "10"].includes(power) &&
        gameState.players[targetPlayerIndex].hand[cardIndex] &&
        gameState.players[targetPlayerIndex].hand[cardIndex] !== null // Check not null
      ) {
        const card = gameState.players[targetPlayerIndex].hand[cardIndex];

        // Send the card info to the player who used the power (only to them)
        if (playerId === this.id) {
          this.emit("power-peek-result", {
            card,
            targetPlayer: gameState.players[targetPlayerIndex].name,
            targetPlayerId: targetPlayerId,
            cardIndex,
          });
        }

        // Add to known cards
        if (!gameState.players[playerIndex].knownCards.includes(card.id)) {
          gameState.players[playerIndex].knownCards.push(card.id);
        }

        console.log(
          `${power} power used: ${gameState.players[playerIndex].name} peeked at ${gameState.players[targetPlayerIndex].name}'s ${card.rank} of ${card.suit}`
        );

        // Clear the active power
        delete gameState.players[playerIndex].activePower;

        // Move to next player
        this.moveToNextPlayer(gameState);

        this.rooms[roomId] = gameState;
        this.emitToAll("game-state-update", this.rooms[roomId]);
      }
    }
  }

  // Placeholder handlers for unused methods
  private handleViewOpponentCard(data: any): void {
    console.log("ViewOpponentCard not used in new logic");
  }

  private handleViewOwnCard(data: any): void {
    console.log("ViewOwnCard not used in new logic");
  }

  private handleUsePowerSwap({
    roomId,
    playerId,
    card1PlayerId,
    card1Index,
    card2PlayerId,
    card2Index,
  }: {
    roomId: string;
    playerId: string;
    card1PlayerId: string;
    card1Index: number;
    card2PlayerId: string;
    card2Index: number;
  }): void {
    if (!this.rooms[roomId]) return;

    const gameState = this.rooms[roomId];
    const playerIndex = gameState.players.findIndex((p) => p.id === playerId);

    if (playerIndex !== -1 && gameState.players[playerIndex].activePower) {
      const power = gameState.players[playerIndex].activePower;

      if (["Q", "K"].includes(power)) {
        const player1Index = gameState.players.findIndex(
          (p) => p.id === card1PlayerId
        );
        const player2Index = gameState.players.findIndex(
          (p) => p.id === card2PlayerId
        );

        if (
          player1Index !== -1 &&
          player2Index !== -1 &&
          gameState.players[player1Index].hand[card1Index] &&
          gameState.players[player2Index].hand[card2Index] &&
          gameState.players[player1Index].hand[card1Index] !== null &&
          gameState.players[player2Index].hand[card2Index] !== null
        ) {
          const card1 = gameState.players[player1Index].hand[card1Index];
          const card2 = gameState.players[player2Index].hand[card2Index];

          // For K (seen swap), show the cards first to the power user
          if (power === "K" && playerId === this.id) {
            this.emit("power-swap-preview", {
              card1,
              card2,
              player1Name: gameState.players[player1Index].name,
              player2Name: gameState.players[player2Index].name,
            });
          }

          // Perform the swap while preserving positions
          const card1Position = card1.position;
          const card2Position = card2.position;

          card2.position = card1Position;
          card1.position = card2Position;

          gameState.players[player1Index].hand[card1Index] = card2;
          gameState.players[player2Index].hand[card2Index] = card1;

          console.log(
            `${power} power used: swapped cards between ${gameState.players[player1Index].name} position ${card1Index} and ${gameState.players[player2Index].name} position ${card2Index}`
          );

          // Clear the active power
          delete gameState.players[playerIndex].activePower;

          // Move to next player
          this.moveToNextPlayer(gameState);

          // Update game state
          this.rooms[roomId] = gameState;
          this.emitToAll("game-state-update", this.rooms[roomId]);
        }
      }
    }
  }
}
