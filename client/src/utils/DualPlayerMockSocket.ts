/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
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

  emit(event: string, data: any): boolean {
    console.log(`📤 [${this.id}] Emitting: ${event}`, data);

    if (
      event === "join-room" ||
      event === "leave-room" ||
      event === "start-game" ||
      event === "draw-card" ||
      event === "eliminate-card" ||
      event === "discard-drawn-card" ||
      event === "swap-drawn-card" ||
      event === "declare" ||
      event === "use-power-on-own-card" ||
      event === "use-power-on-opponent-card" ||
      event === "complete-elimination-card-give" ||
      event === "use-power-swap" ||
      event === "activate-power" ||
      event === "skip-power"
    ) {
      this.handleClientEvents(event, data);
      return true;
    }

    // Broadcast to all instances
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

  private handleClientEvents(event: string, data: any): void {
    console.log(`⚡ [${this.id}] Handling: ${event}`, data);
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
      case "complete-elimination-card-give":
        this.handleCompleteEliminationCardGive(data);
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
      case "use-power-on-own-card":
        this.handleUsePowerOnOwnCard(data);
        break;
      case "use-power-on-opponent-card":
        this.handleUsePowerOnOpponentCard(data);
        break;
      case "use-power-swap":
        this.handleUsePowerSwap(data);
        break;
      case "activate-power":
        this.handleActivatePower(data);
        break;
      case "skip-power":
        this.handleSkipPower(data);
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
      // Jack power: Apply immediately (skip next player) AND continue turn sequence normally
      const nextPlayerIndex =
        (gameState.currentPlayerIndex + 1) % gameState.players.length;
      gameState.players[nextPlayerIndex].skippedTurn = true;
      console.log(
        `⚡ Jack power: Skipping ${gameState.players[nextPlayerIndex].name}`
      );
      
      // Jack power doesn't block turn progression - continue to move turn to next player
    } else if (["7", "8", "9", "10", "Q", "K"].includes(drawnCard.rank)) {
      // Other power cards: Make power available for choice, DON'T move to next player yet
      const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
      if (playerIndex !== -1) {
        gameState.players[playerIndex].activePower = drawnCard.rank;
        gameState.players[playerIndex].usingPower = false; // Player needs to choose
        console.log(
          `⚡ ${drawnCard.rank} power available for ${gameState.players[playerIndex].name} - awaiting choice`
        );

        delete DualPlayerMockSocket.drawnCards[playerId];
        gameState.lastAction = {
          type: "discard",
          playerId,
          cardId,
          timestamp: Date.now(),
        };
        DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
        return; // Don't move to next player yet - wait for power choice
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
      (c) => c && c.id === handCardId
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
      (p) => p.id === playerId
    );
    if (eliminatingPlayerIndex === -1) return;

    // Check if this player has already eliminated a card this round
    if (gameState.players[eliminatingPlayerIndex].hasEliminatedThisRound) {
      console.log("Player has already eliminated a card this round");
      return;
    }

    // Find which player owns the card being eliminated
    let cardOwnerIndex = -1;
    let cardIndex = -1;
    let cardToEliminate = null;

    for (let i = 0; i < gameState.players.length; i++) {
      const foundCardIndex = gameState.players[i].hand.findIndex(
        (c) => c && c.id === cardId // Ensure we skip null cards
      );
      if (foundCardIndex !== -1) {
        cardOwnerIndex = i;
        cardIndex = foundCardIndex;
        cardToEliminate = gameState.players[i].hand[foundCardIndex];
        break;
      }
    }

    if (cardOwnerIndex === -1 || cardIndex === -1 || !cardToEliminate) {
      console.log(
        "Card not found in any player's hand or card is already eliminated"
      );
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
      // Valid elimination
      const eliminatedCard = { ...cardToEliminate };

      console.log(
        `✅ ${gameState.players[eliminatingPlayerIndex].name} eliminated ${eliminatedCard.rank} from ${gameState.players[cardOwnerIndex].name} at position ${cardIndex}`
      );

      // Add the eliminated card to discard pile
      gameState.discardPile.push(eliminatedCard);

      // Set the eliminated position to null
      gameState.players[cardOwnerIndex].hand[cardIndex] = null;

      // Mark the eliminating player as having eliminated this round
      gameState.players[eliminatingPlayerIndex].hasEliminatedThisRound = true;

      // Clear any unused power when player performs elimination (mutually exclusive)
      if (gameState.players[eliminatingPlayerIndex].activePower && !gameState.players[eliminatingPlayerIndex].usingPower) {
        console.log(`🚫 Clearing unused ${gameState.players[eliminatingPlayerIndex].activePower} power due to elimination choice`);
        delete gameState.players[eliminatingPlayerIndex].activePower;
        delete gameState.players[eliminatingPlayerIndex].usingPower;
      }

      // Validate hand integrity after elimination
      this.validateHandIntegrity(
        gameState.players[cardOwnerIndex].hand,
        gameState.players[cardOwnerIndex].name
      );

      // Emit event to trigger card selection UI for the eliminating player
      DualPlayerMockSocket.broadcastToAll(
        "elimination-card-selection-required",
        {
          eliminatingPlayerId: playerId,
          cardOwnerId: gameState.players[cardOwnerIndex].id,
          cardOwnerName: gameState.players[cardOwnerIndex].name,
          cardIndex: cardIndex,
          eliminatedCard: eliminatedCard,
        }
      );

      // Update game state
      gameState.lastAction = {
        type: "elimination",
        playerId,
        cardId,
        timestamp: Date.now(),
      };

      DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
    } else {
      // Invalid elimination - apply penalty
      console.log("❌ Invalid elimination - applying penalty");

      // Clear any unused power when player attempts elimination (mutually exclusive)
      if (gameState.players[eliminatingPlayerIndex].activePower && !gameState.players[eliminatingPlayerIndex].usingPower) {
        console.log(`🚫 Clearing unused ${gameState.players[eliminatingPlayerIndex].activePower} power due to elimination attempt`);
        delete gameState.players[eliminatingPlayerIndex].activePower;
        delete gameState.players[eliminatingPlayerIndex].usingPower;
      }

      if (gameState.deck.length > 0) {
        const penaltyCard = gameState.deck.pop()!;
        penaltyCard.isRevealed = false;

        // Find first null position or add to end
        const eliminatingPlayer = gameState.players[eliminatingPlayerIndex];
        let addedToPosition = false;

        for (let i = 0; i < eliminatingPlayer.hand.length; i++) {
          if (eliminatingPlayer.hand[i] === null) {
            eliminatingPlayer.hand[i] = penaltyCard;
            penaltyCard.position = i;
            addedToPosition = true;
            console.log(`📌 Added penalty card to null position ${i}`);
            break;
          }
        }

        if (!addedToPosition) {
          // No null positions, add to end
          penaltyCard.position = eliminatingPlayer.hand.length;
          eliminatingPlayer.hand.push(penaltyCard);
          console.log(
            `📌 Added penalty card to end position ${penaltyCard.position}`
          );
        }

        DualPlayerMockSocket.broadcastToAll("penalty-card", {
          playerId,
          penaltyCard,
          reason: "Invalid elimination attempt",
        });
      }

      gameState.players[eliminatingPlayerIndex].hasEliminatedThisRound = true;
    }

    gameState.lastAction = {
      type: "discard",
      playerId,
      cardId,
      timestamp: Date.now(),
    };

    DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
  }

  private handleCompleteEliminationCardGive({
    roomId,
    eliminatingPlayerId,
    cardOwnerId,
    cardOwnerName,
    selectedCardIndex,
    targetCardIndex,
    eliminatedCard,
  }: {
    roomId: string;
    eliminatingPlayerId: string;
    cardOwnerId: string;
    cardOwnerName: string;
    selectedCardIndex: number;
    targetCardIndex: number;
    eliminatedCard: Card;
  }): void {
    if (!DualPlayerMockSocket.sharedRooms[roomId]) return;

    const gameState = DualPlayerMockSocket.sharedRooms[roomId];

    // Find the players
    const eliminatingPlayerIndex = gameState.players.findIndex(
      (p) => p.id === eliminatingPlayerId
    );
    const cardOwnerIndex = gameState.players.findIndex(
      (p) => p.id === cardOwnerId
    );

    if (eliminatingPlayerIndex === -1 || cardOwnerIndex === -1) {
      console.error("❌ Players not found for card transfer");
      return;
    }

    // CRITICAL FIX: Validate indices and handle null cards properly
    const eliminatingPlayer = gameState.players[eliminatingPlayerIndex];
    const cardOwner = gameState.players[cardOwnerIndex];

    // Ensure the selected card index is valid and points to a non-null card
    if (
      selectedCardIndex < 0 ||
      selectedCardIndex >= eliminatingPlayer.hand.length ||
      eliminatingPlayer.hand[selectedCardIndex] === null
    ) {
      console.error(`❌ Invalid selected card index: ${selectedCardIndex}`);
      console.error("Eliminating player hand:", eliminatingPlayer.hand);
      return;
    }

    // Ensure the target card index is valid
    if (targetCardIndex < 0 || targetCardIndex >= cardOwner.hand.length) {
      console.error(`❌ Invalid target card index: ${targetCardIndex}`);
      return;
    }

    // Get the card to give from eliminating player
    const cardToGive = eliminatingPlayer.hand[selectedCardIndex];

    if (!cardToGive) {
      console.error("❌ Selected card is null or doesn't exist");
      console.error("Selected index:", selectedCardIndex);
      console.error("Eliminating player hand:", eliminatingPlayer.hand);
      return;
    }

    // Log the transfer for debugging
    console.log(
      `🎁 Transfer: ${eliminatingPlayer.name} giving ${cardToGive.rank} (index ${selectedCardIndex}) to ${cardOwner.name} (position ${targetCardIndex})`
    );

    // Perform the card transfer
    // 1. Place the given card in the eliminated card's position
    cardOwner.hand[targetCardIndex] = { ...cardToGive };
    cardOwner.hand[targetCardIndex].position = targetCardIndex;

    // 2. Replace the given card with null in eliminating player's hand
    eliminatingPlayer.hand[selectedCardIndex] = null;

    console.log(
      `🎁 ${eliminatingPlayer.name} gave ${cardToGive.rank} to ${cardOwner.name} at position ${targetCardIndex}`
    );

    // Emit the card transfer event ONCE
    const transferData = {
      eliminatingPlayerId: eliminatingPlayerId,
      eliminatingPlayerName: eliminatingPlayer.name,
      cardOwnerId: cardOwnerId,
      cardOwnerName: cardOwnerName,
      eliminatedCard: eliminatedCard,
      givenCard: cardToGive,
      position: targetCardIndex,
    };

    // Use a single broadcast to prevent duplicates
    DualPlayerMockSocket.broadcastToAll(
      "elimination-card-transfer",
      transferData
    );

    // Reset elimination tracking for the next round
    // Only reset for other players, keep the eliminating player marked until next discard
    gameState.players.forEach((player, idx) => {
      if (idx !== eliminatingPlayerIndex) {
        player.hasEliminatedThisRound = false;
      }
    });

    // Clear any active powers and reset turn state
    gameState.players.forEach((player) => {
      if (player.activePower) {
        player.activePower = undefined;
      }
    });

    // Update game state with a single broadcast
    DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
  }

  // Additional helper function to validate hand integrity after elimination
  private validateHandIntegrity(
    hand: (Card | null)[],
    playerName: string
  ): boolean {
    let nullCount = 0;
    let cardCount = 0;

    for (let i = 0; i < hand.length; i++) {
      if (hand[i] === null) {
        nullCount++;
      } else {
        cardCount++;
        // Ensure position property matches array index
        if (hand[i]!.position !== i) {
          console.warn(
            `⚠️ Position mismatch for ${playerName}: card at index ${i} has position ${
              hand[i]!.position
            }`
          );
          hand[i]!.position = i;
        }
      }
    }

    console.log(
      `🔍 ${playerName} hand integrity: ${cardCount} cards, ${nullCount} eliminated positions`
    );
    return true;
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

  private handleActivatePower({
    roomId,
    playerId,
    powerType,
  }: {
    roomId: string;
    playerId: string;
    powerType: string;
  }): void {
    if (!DualPlayerMockSocket.sharedRooms[roomId]) return;

    const gameState = DualPlayerMockSocket.sharedRooms[roomId];
    const playerIndex = gameState.players.findIndex((p) => p.id === playerId);

    if (playerIndex !== -1 && gameState.players[playerIndex].activePower === powerType) {
      // Set usingPower to true to indicate player chose to use their power
      gameState.players[playerIndex].usingPower = true;
      
      console.log(
        `⚡ ${gameState.players[playerIndex].name} chose to activate ${powerType} power`
      );

      gameState.lastAction = {
        type: "discard", // Keep the discard action context
        playerId,
        timestamp: Date.now(),
        message: `Activated ${powerType} power`,
      };

      // Broadcast the updated game state so UI shows power is now active
      DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
    }
  }

  private handleSkipPower({
    roomId,
    playerId,
    powerType,
  }: {
    roomId: string;
    playerId: string;
    powerType: string;
  }): void {
    if (!DualPlayerMockSocket.sharedRooms[roomId]) return;

    const gameState = DualPlayerMockSocket.sharedRooms[roomId];
    const playerIndex = gameState.players.findIndex((p) => p.id === playerId);

    if (playerIndex !== -1 && gameState.players[playerIndex].activePower === powerType) {
      // Clear the power and move to next player
      delete gameState.players[playerIndex].activePower;
      delete gameState.players[playerIndex].usingPower;
      
      console.log(
        `❌ ${gameState.players[playerIndex].name} chose to skip ${powerType} power`
      );

      gameState.lastAction = {
        type: "discard",
        playerId,
        timestamp: Date.now(),
        message: `Skipped ${powerType} power`,
      };

      // Move to next player since power was skipped
      DualPlayerMockSocket.moveToNextPlayer(gameState);

      // Broadcast the updated game state
      DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
    }
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
