/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// client/src/utils/DualPlayerMockSocket.ts - Updated King power to properly reveal cards
import { BrowserEventEmitter } from "./BrowserEventEmitter";
import {
  createDeck,
  shuffleDeck,
  dealCards,
  revealInitialCards,
} from "./cardUtils";
import type { Card } from "./cardUtils";
import type { GameState, Player } from "./gameLogic";

class DualPlayerMockSocket extends BrowserEventEmitter {
  private static instances: Map<string, DualPlayerMockSocket> = new Map();
  private static sharedRooms: Record<string, GameState> = {};
  private static drawnCards: Record<string, Card> = {};

  private connected = true;
  private id: string;

  constructor(playerId: string) {
    super();
    this.id = playerId;
    console.log(`🔌 DualPlayerMockSocket initialized for: ${this.id}`);
  }

  // Create or get instance for specific player
  public static getInstance(playerId: string): DualPlayerMockSocket {
    if (!DualPlayerMockSocket.instances.has(playerId)) {
      DualPlayerMockSocket.instances.set(
        playerId,
        new DualPlayerMockSocket(playerId)
      );
    }
    return DualPlayerMockSocket.instances.get(playerId)!;
  }

  // Broadcast to all player instances
  private static broadcastToAll(event: string, data: any): void {
    console.log(`📡 Broadcasting ${event} to all players`, data);
    DualPlayerMockSocket.instances.forEach((instance, playerId) => {
      console.log(`  → Sending to ${playerId}`);
      instance.emitToSelf(event, data);
    });
  }

  // Broadcast to specific player
  private static broadcastToPlayer(
    playerId: string,
    event: string,
    data: any
  ): void {
    console.log(`📡 Broadcasting ${event} to ${playerId}`, data);
    const instance = DualPlayerMockSocket.instances.get(playerId);
    if (instance) {
      instance.emitToSelf(event, data);
    }
  }

  private static moveToNextPlayer(gameState: GameState): void {
    if (!gameState.players.length) return;

    const currentPlayerName =
      gameState.players[gameState.currentPlayerIndex].name;
    console.log(
      `🔄 [TURN] Current: ${currentPlayerName} (index ${gameState.currentPlayerIndex})`
    );

    let nextPlayerIndex =
      (gameState.currentPlayerIndex + 1) % gameState.players.length;

    let attempts = 0;
    while (
      gameState.players[nextPlayerIndex]?.skippedTurn &&
      attempts < gameState.players.length
    ) {
      console.log(
        `⏭️ [TURN] ${gameState.players[nextPlayerIndex].name} turn skipped`
      );
      gameState.players[nextPlayerIndex].skippedTurn = false;
      nextPlayerIndex = (nextPlayerIndex + 1) % gameState.players.length;
      attempts++;
    }

    gameState.currentPlayerIndex = nextPlayerIndex;
    const newPlayerName = gameState.players[nextPlayerIndex].name;
    console.log(`✅ [TURN] Next: ${newPlayerName} (index ${nextPlayerIndex})`);
  }

  getId(): string {
    return this.id;
  }

  setId(id: string): void {
    const oldId = this.id;
    DualPlayerMockSocket.instances.delete(this.id);
    this.id = id;
    DualPlayerMockSocket.instances.set(id, this);
    console.log(`🔄 Socket ID changed: ${oldId} → ${id}`);
  }

  private emitToSelf(event: string, data: any): void {
    super.emit(event, data);
  }

// Update your existing emit method to include give-card:
  emit(event: string, data: any): boolean {
    console.log(`📤 [${this.id}] Emitting: ${event}`, data);

    if (
      event === "join-room" ||
      event === "leave-room" ||
      event === "start-game" ||
      event === "draw-card" ||
      event === "eliminate-card" ||
      event === "give-card" ||           // ADD THIS LINE
      event === "discard-drawn-card" ||
      event === "swap-drawn-card" ||
      event === "declare" ||
      event === "use-power-on-own-card" ||
      event === "use-power-on-opponent-card" ||
      event === "use-power-swap"
    ) {
      this.handleClientEvents(event, data);
      return true;
    }

    setTimeout(() => {
      DualPlayerMockSocket.broadcastToAll(event, data);
    }, 10);

    return true;
  }

  on(event: string, listener: (...args: any[]) => void): this {
    console.log(`👂 [${this.id}] Listening for: ${event}`);
    return super.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): this {
    console.log(`🔇 [${this.id}] Removing listener for: ${event}`);
    return super.off(event, listener);
  }

  // Update your existing handleClientEvents method by adding this case:
  private handleClientEvents(event: string, data: any): void {
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
      case "give-card": // ADD THIS CASE
        this.handleGiveCard(data); // ADD THIS LINE
        break; // ADD THIS LINE
      case "discard-drawn-card":
        this.handleDiscardDrawnCard(data);
        break;
      case "swap-drawn-card":
        this.handleSwapDrawnCard(data);
        break;
      case "declare":
        this.handleDeclare(data);
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
        console.log(`❓ Unhandled event: ${event}`);
    }
  }

  // ... (keeping all the existing handler methods the same until handleUsePowerSwap)

  private handleJoinRoom({
    roomId,
    playerName,
  }: {
    roomId: string;
    playerName: string;
  }): void {
    console.log(`🚪 [${this.id}] Joining room: ${roomId} as ${playerName}`);

    if (!DualPlayerMockSocket.sharedRooms[roomId]) {
      DualPlayerMockSocket.sharedRooms[roomId] = {
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
      console.log(`🆕 Created new room: ${roomId}`);
    }

    const gameState = DualPlayerMockSocket.sharedRooms[roomId];
    const existingPlayerIndex = gameState.players.findIndex(
      (p) => p.id === this.id
    );

    if (existingPlayerIndex >= 0) {
      console.log(
        `🔄 Player ${this.id} already in room, updating name to ${playerName}`
      );
      gameState.players[existingPlayerIndex].name = playerName;
    } else {
      const hasHost = gameState.players.some((p) => p.isHost);
      const isHost = !hasHost;

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

      console.log(`➕ Adding new player: ${playerName} (Host: ${isHost})`);
      gameState.players.push(newPlayer);
    }

    DualPlayerMockSocket.broadcastToAll("player-joined", {
      roomId,
      name: playerName,
      id: this.id,
    });
    DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
  }

  private handleLeaveRoom({
    roomId,
    playerId,
  }: {
    roomId: string;
    playerId: string;
  }): void {
    console.log(`🚪 [${this.id}] Leaving room: ${roomId}`);

    if (!DualPlayerMockSocket.sharedRooms[roomId]) return;

    const gameState = DualPlayerMockSocket.sharedRooms[roomId];
    const playerName =
      gameState.players.find((p) => p.id === playerId)?.name || playerId;

    gameState.players = gameState.players.filter(
      (player) => player.id !== playerId
    );

    console.log(`➖ Removed player: ${playerName}`);

    if (gameState.players.length === 0) {
      delete DualPlayerMockSocket.sharedRooms[roomId];
      console.log(`🗑️ Deleted empty room: ${roomId}`);
    } else {
      if (!gameState.players.some((player) => player.isHost)) {
        gameState.players[0].isHost = true;
        console.log(`👑 New host: ${gameState.players[0].name}`);
      }
      DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
    }
  }

  private handleStartGame({ roomId }: { roomId: string }): void {
    console.log(`🎮 [${this.id}] Starting game in room: ${roomId}`);

    if (!DualPlayerMockSocket.sharedRooms[roomId]) {
      console.error(`❌ No room found: ${roomId}`);
      return;
    }

    const gameState = DualPlayerMockSocket.sharedRooms[roomId];
    const playerCount = gameState.players.length;

    const requestingPlayer = gameState.players.find((p) => p.id === this.id);
    if (!requestingPlayer?.isHost) {
      console.log(
        `⛔ Only host can start game (requested by ${requestingPlayer?.name})`
      );
      DualPlayerMockSocket.broadcastToPlayer(this.id, "error", {
        message: "Only host can start the game",
      });
      return;
    }

    console.log(`🎯 Starting game with ${playerCount} players`);

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

      console.log(`🃏 Dealt ${hand.length} cards to ${player.name}`);
    });

    DualPlayerMockSocket.drawnCards = {};

    DualPlayerMockSocket.broadcastToAll("start-game", { roomId });
    DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);

    console.log(`✅ Game started successfully in room ${roomId}`);
  }

  private handleDrawCard({
    roomId,
    playerId,
  }: {
    roomId: string;
    playerId: string;
  }): void {
    if (!DualPlayerMockSocket.sharedRooms[roomId]) return;

    const gameState = DualPlayerMockSocket.sharedRooms[roomId];
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    if (currentPlayer.id !== playerId) {
      console.log(`⛔ Not ${playerId}'s turn (current: ${currentPlayer.name})`);
      return;
    }

    if (gameState.deck.length > 0) {
      const drawnCard = gameState.deck.pop()!;
      drawnCard.isRevealed = true;

      DualPlayerMockSocket.drawnCards[playerId] = drawnCard;

      gameState.lastAction = {
        type: "draw",
        playerId,
        timestamp: Date.now(),
      };

      console.log(
        `🎴 ${currentPlayer.name} drew: ${drawnCard.rank} of ${drawnCard.suit}`
      );

      DualPlayerMockSocket.broadcastToPlayer(playerId, "card-drawn", drawnCard);
      DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
    } else {
      console.log(`⛔ No cards left to draw`);
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
    if (!DualPlayerMockSocket.sharedRooms[roomId]) return;

    const gameState = DualPlayerMockSocket.sharedRooms[roomId];
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return;

    const drawnCard = DualPlayerMockSocket.drawnCards[playerId];
    if (!drawnCard) {
      console.error(`❌ No drawn card found for ${playerId}`);
      return;
    }

    gameState.discardPile.push(drawnCard);
    console.log(
      `♻️ ${currentPlayer.name} discarded: ${drawnCard.rank} of ${drawnCard.suit}`
    );

    // Reset elimination tracking
    gameState.players.forEach((player) => {
      player.hasEliminatedThisRound = false;
    });

    // Apply card powers
    if (drawnCard.rank === "J") {
      const nextPlayerIndex =
        (gameState.currentPlayerIndex + 1) % gameState.players.length;
      gameState.players[nextPlayerIndex].skippedTurn = true;
      console.log(
        `⚡ Jack power: Skipping ${gameState.players[nextPlayerIndex].name}`
      );
    }

    if (["7", "8", "9", "10", "Q", "K"].includes(drawnCard.rank)) {
      const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
      if (playerIndex !== -1) {
        gameState.players[playerIndex].activePower = drawnCard.rank;
        console.log(
          `⚡ ${drawnCard.rank} power activated for ${gameState.players[playerIndex].name}`
        );

        delete DualPlayerMockSocket.drawnCards[playerId];
        gameState.lastAction = {
          type: "discard",
          playerId,
          cardId,
          timestamp: Date.now(),
        };
        DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
        return;
      }
    }

    delete DualPlayerMockSocket.drawnCards[playerId];
    gameState.lastAction = {
      type: "discard",
      playerId,
      cardId,
      timestamp: Date.now(),
    };
    DualPlayerMockSocket.moveToNextPlayer(gameState);
    DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
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
    if (!DualPlayerMockSocket.sharedRooms[roomId]) return;

    const gameState = DualPlayerMockSocket.sharedRooms[roomId];
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return;

    const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
    const cardIndex = gameState.players[playerIndex].hand.findIndex(
      (c) => c!.id === handCardId
    );

    if (playerIndex !== -1 && cardIndex !== -1) {
      const drawnCard = DualPlayerMockSocket.drawnCards[playerId];
      if (!drawnCard) {
        console.error(`❌ No drawn card found for ${playerId}`);
        return;
      }

      const handCard = gameState.players[playerIndex].hand[cardIndex];
      drawnCard.isRevealed = false;
      gameState.players[playerIndex].hand[cardIndex] = drawnCard;
      gameState.discardPile.push(handCard!);

      gameState.players.forEach((player) => {
        player.hasEliminatedThisRound = false;
      });

      delete DualPlayerMockSocket.drawnCards[playerId];

      console.log(
        `🔄 ${currentPlayer.name} swapped: ${drawnCard.rank} → hand, ${
          handCard!.rank
        } → discard`
      );

      gameState.lastAction = {
        type: "swap",
        playerId,
        cardId: handCardId,
        timestamp: Date.now(),
      };
      DualPlayerMockSocket.moveToNextPlayer(gameState);
      DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
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
    if (!DualPlayerMockSocket.sharedRooms[roomId]) return;

    const gameState = DualPlayerMockSocket.sharedRooms[roomId];

    // Find the player trying to eliminate
    const eliminatingPlayerIndex = gameState.players.findIndex(
      (p: Player) => p.id === playerId
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
        (c: Card | null) => c && c.id === cardId
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
        .map((card: Card | null, index: number) => ({ card, index }))
        .filter(({ card }: { card: Card | null }) => card !== null);

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
          availableCards: availableCards.map(
            ({ card, index }: { card: Card | null; index: number }) => ({
              cardId: card!.id,
              cardIndex: index,
              card: card!,
            })
          ),
        };

        console.log(
          `${gameState.players[eliminatingPlayerIndex].name} eliminated ${
            eliminatedCard!.rank
          } from ${
            gameState.players[cardOwnerIndex].name
          }'s hand. Now choosing card to give...`
        );

        // Emit event to show card selection UI to eliminating player
        DualPlayerMockSocket.broadcastToAll("elimination-card-selection", {
          eliminatingPlayerId: playerId,
          eliminatingPlayerName: gameState.players[eliminatingPlayerIndex].name,
          cardOwnerId: gameState.players[cardOwnerIndex].id,
          cardOwnerName: gameState.players[cardOwnerIndex].name,
          eliminatedCard: eliminatedCard,
          availableCards: gameState.pendingCardGiving.availableCards,
        });
      }

      // Reset elimination tracking for all other players
      gameState.players.forEach((player: Player, idx: number) => {
        if (idx !== eliminatingPlayerIndex) {
          player.hasEliminatedThisRound = false;
        }
      });
    } else {
      // Invalid elimination - penalty for eliminating player
      console.log("Invalid elimination - penalty for eliminating player");

      if (gameState.deck.length > 0) {
        const penaltyCard = gameState.deck.pop()!;
        penaltyCard.isRevealed = false;

        // Find first available slot for penalty card
        let slotFound = false;
        for (
          let i = 0;
          i < gameState.players[eliminatingPlayerIndex].hand.length;
          i++
        ) {
          if (gameState.players[eliminatingPlayerIndex].hand[i] === null) {
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

    DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
  }
  // Add this new method to DualPlayerMockSocket class
  // Add this new method to DualPlayerMockSocket class
  private handleGiveCard({
    roomId,
    playerId,
    cardIndex,
  }: {
    roomId: string;
    playerId: string;
    cardIndex: number;
  }): void {
    if (!DualPlayerMockSocket.sharedRooms[roomId]) return;

    const gameState = DualPlayerMockSocket.sharedRooms[roomId];

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
      (ac: any) => ac.cardIndex === cardIndex
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
    DualPlayerMockSocket.broadcastToAll("elimination-card-transfer", {
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

    DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
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
    if (!DualPlayerMockSocket.sharedRooms[roomId]) return;

    const gameState = DualPlayerMockSocket.sharedRooms[roomId];
    const playerIndex = gameState.players.findIndex((p) => p.id === playerId);

    if (playerIndex !== -1 && gameState.players[playerIndex].activePower) {
      const power = gameState.players[playerIndex].activePower;
      const playerName = gameState.players[playerIndex].name;

      if (
        ["7", "8"].includes(power) &&
        gameState.players[playerIndex].hand[cardIndex]
      ) {
        const card = gameState.players[playerIndex].hand[cardIndex];

        DualPlayerMockSocket.broadcastToPlayer(playerId, "power-peek-result", {
          card,
          targetPlayer: `${playerName} (You)`,
          cardIndex,
        });

        if (!gameState.players[playerIndex].knownCards.includes(card.id)) {
          gameState.players[playerIndex].knownCards.push(card.id);
        }

        console.log(
          `👁️ ${playerName} peeked at own ${card.rank} with ${power} power`
        );

        delete gameState.players[playerIndex].activePower;
        DualPlayerMockSocket.moveToNextPlayer(gameState);
        DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
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
    if (!DualPlayerMockSocket.sharedRooms[roomId]) return;

    const gameState = DualPlayerMockSocket.sharedRooms[roomId];
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
      const playerName = gameState.players[playerIndex].name;
      const targetName = gameState.players[targetPlayerIndex].name;

      if (
        ["9", "10"].includes(power) &&
        gameState.players[targetPlayerIndex].hand[cardIndex]
      ) {
        const card = gameState.players[targetPlayerIndex].hand[cardIndex];

        DualPlayerMockSocket.broadcastToPlayer(playerId, "power-peek-result", {
          card,
          targetPlayer: targetName,
          targetPlayerId: targetPlayerId,
          cardIndex,
        });

        if (!gameState.players[playerIndex].knownCards.includes(card.id)) {
          gameState.players[playerIndex].knownCards.push(card.id);
        }

        console.log(
          `👁️ ${playerName} peeked at ${targetName}'s ${card.rank} with ${power} power`
        );

        delete gameState.players[playerIndex].activePower;
        DualPlayerMockSocket.moveToNextPlayer(gameState);
        DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
      }
    }
  }

  // FIXED: King power implementation with proper card revelation
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
    if (!DualPlayerMockSocket.sharedRooms[roomId]) return;

    const gameState = DualPlayerMockSocket.sharedRooms[roomId];
    const playerIndex = gameState.players.findIndex((p) => p.id === playerId);

    if (playerIndex !== -1 && gameState.players[playerIndex].activePower) {
      const power = gameState.players[playerIndex].activePower;
      const playerName = gameState.players[playerIndex].name;

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
          const player1Name = gameState.players[player1Index].name;
          const player2Name = gameState.players[player2Index].name;

          // For K (seen swap), reveal both cards to ALL PLAYERS before swapping
          if (power === "K") {
            console.log(`👁️ K Power: Revealing both cards before swap`);

            // Broadcast the card revelations to all players
            DualPlayerMockSocket.broadcastToAll("king-power-reveal", {
              powerUserId: playerId,
              powerUserName: playerName,
              card1: {
                card: card1,
                playerId: card1PlayerId,
                playerName: player1Name,
                cardIndex: card1Index,
              },
              card2: {
                card: card2,
                playerId: card2PlayerId,
                playerName: player2Name,
                cardIndex: card2Index,
              },
              message: `${playerName} used King power - revealing cards before swap`,
            });

            // Wait a moment for players to see the revealed cards
            setTimeout(() => {
              this.performSwap(
                gameState,
                player1Index,
                card1Index,
                player2Index,
                card2Index,
                card1,
                card2,
                playerIndex,
                power,
                playerName,
                player1Name,
                player2Name
              );
            }, 2000); // 2 second delay to show the revealed cards
          } else {
            // For Q (unseen swap), swap immediately without revealing
            console.log(`🔄 Q Power: Unseen swap`);
            this.performSwap(
              gameState,
              player1Index,
              card1Index,
              player2Index,
              card2Index,
              card1,
              card2,
              playerIndex,
              power,
              playerName,
              player1Name,
              player2Name
            );
          }
        }
      }
    }
  }

  // Helper method to perform the actual swap
  private performSwap(
    gameState: GameState,
    player1Index: number,
    card1Index: number,
    player2Index: number,
    card2Index: number,
    card1: Card,
    card2: Card,
    powerUserIndex: number,
    power: string,
    powerUserName: string,
    player1Name: string,
    player2Name: string
  ): void {
    // Preserve positions while swapping
    const card1Position = card1.position;
    const card2Position = card2.position;

    card2.position = card1Position;
    card1.position = card2Position;

    // Perform the swap
    gameState.players[player1Index].hand[card1Index] = card2;
    gameState.players[player2Index].hand[card2Index] = card1;

    console.log(
      `🔄 ${powerUserName} used ${power} power: swapped ${card1.rank} (${player1Name}) ↔ ${card2.rank} (${player2Name})`
    );

    // Clear the active power
    delete gameState.players[powerUserIndex].activePower;

    // Move to next player
    DualPlayerMockSocket.moveToNextPlayer(gameState);

    // Broadcast the completed swap
    DualPlayerMockSocket.broadcastToAll("power-swap-completed", {
      powerUserId: gameState.players[powerUserIndex].id,
      powerUserName: powerUserName,
      power: power,
      swapDetails: {
        player1Name,
        player2Name,
        card1Rank: card1.rank,
        card2Rank: card2.rank,
      },
    });

    // Update game state
    DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
  }

  // Updated declare handler in DualPlayerMockSocket.ts

  private handleDeclare({
    roomId,
    playerId,
    declaredRanks,
  }: {
    roomId: string;
    playerId: string;
    declaredRanks: string[];
  }): void {
    if (!DualPlayerMockSocket.sharedRooms[roomId]) return;

    const gameState = DualPlayerMockSocket.sharedRooms[roomId];
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return;

    const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return;

    const playerName = gameState.players[playerIndex].name;
    const playerHand = gameState.players[playerIndex].hand;

    // Get only the actual (non-null) cards and their ranks
    const actualCards = playerHand.filter(
      (card): card is Card => card !== null
    );
    const actualRanks = actualCards.map((card) => card.rank);

    console.log(`🎯 ${playerName} declared:`);
    console.log(
      `   Hand structure: [${playerHand
        .map((card) => (card ? card.rank : "ELIMINATED"))
        .join(", ")}]`
    );
    console.log(
      `   Actual cards: ${actualCards.length} (${actualRanks.join(", ")})`
    );
    console.log(`   Declared: [${declaredRanks.join(", ")}]`);
    console.log(`   Expected: [${actualRanks.join(", ")}]`);

    // Validate declaration - should match actual cards only
    const isValidDeclaration =
      declaredRanks.length === actualCards.length &&
      declaredRanks.every((rank, index) => actualRanks[index] === rank);

    console.log(`   Valid: ${isValidDeclaration ? "✅" : "❌"}`);

    // End the game
    gameState.gameStatus = "ended";
    gameState.declarer = playerId;
    gameState.lastAction = { type: "declare", playerId, timestamp: Date.now() };

    // Calculate final scores for all players
    gameState.players.forEach((player) => {
      // Reveal all remaining cards
      player.hand.forEach((card) => {
        if (card) card.isRevealed = true;
      });

      // Calculate score: sum of remaining cards + 0 for eliminated cards
      player.score = player.hand.reduce(
        (sum, card) => sum + (card ? card.value : 0), // null cards = 0 points
        0
      );
    });

    // Apply penalty for invalid declaration
    if (!isValidDeclaration) {
      gameState.players[playerIndex].score += 20; // Penalty for wrong declaration
      console.log(`⚠️ ${playerName} gets +20 penalty for invalid declaration`);
    }

    // Find winner(s) - lowest score wins
    const minScore = Math.min(...gameState.players.map((p) => p.score));
    const winners = gameState.players
      .filter((p) => p.score === minScore)
      .map((p) => ({ id: p.id, name: p.name, score: p.score }));

    console.log(`🏆 Game ended!`);
    console.log(
      `   Final scores: ${gameState.players
        .map((p) => `${p.name}: ${p.score}`)
        .join(", ")}`
    );
    console.log(
      `   Winners: ${winners
        .map((w) => w.name)
        .join(", ")} (${minScore} points)`
    );

    // Show detailed score breakdown
    gameState.players.forEach((player) => {
      const remainingCards = player.hand.filter((card) => card !== null);
      const eliminatedCount = player.hand.length - remainingCards.length;
      console.log(
        `   ${player.name}: ${remainingCards.length} cards (${remainingCards
          .map((c) => `${c.rank}=${c.value}`)
          .join(", ")}) + ${eliminatedCount} eliminated = ${player.score} total`
      );
    });

    DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
    DualPlayerMockSocket.broadcastToAll("game-ended", {
      declarer: playerId,
      winners,
      isValidDeclaration,
      scoreBreakdown: gameState.players.map((player) => ({
        id: player.id,
        name: player.name,
        score: player.score,
        remainingCards: player.hand.filter((card) => card !== null).length,
        eliminatedCards: player.hand.filter((card) => card === null).length,
      })),
    });
  }
}

export default DualPlayerMockSocket;
