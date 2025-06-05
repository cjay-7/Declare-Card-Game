// client/src/utils/DualPlayerMockSocket.ts - Improved logging for better debugging
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
      event === "use-power-swap"
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
      // Don't change host status - keep existing host status
    } else {
      // Only make new player host if no host exists
      const hasHost = gameState.players.some((p) => p.isHost);
      const isHost = !hasHost; // Only host if no existing host

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
        `🔄 ${currentPlayer.name} swapped: ${drawnCard.rank} → hand, ${handCard!.rank} → discard`
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
    const eliminatingPlayerIndex = gameState.players.findIndex(
      (p) => p.id === playerId
    );

    if (eliminatingPlayerIndex === -1) return;
    if (gameState.players[eliminatingPlayerIndex].hasEliminatedThisRound) {
      console.log(
        `⛔ ${gameState.players[eliminatingPlayerIndex].name} already eliminated this round`
      );
      return;
    }

    // Find card owner
    let cardOwnerIndex = -1;
    let cardIndex = -1;
    let cardToEliminate = null;

    for (let i = 0; i < gameState.players.length; i++) {
      const foundCardIndex = gameState.players[i].hand.findIndex(
        (c) => c !== null && c.id === cardId // Explicit null check
      );
      if (foundCardIndex !== -1) {
        cardOwnerIndex = i;
        cardIndex = foundCardIndex;
        cardToEliminate = gameState.players[i].hand[foundCardIndex];
        break;
      }
    }

    if (cardOwnerIndex === -1 || !cardToEliminate || cardToEliminate === null)
      return;

    const topDiscardCard =
      gameState.discardPile.length > 0
        ? gameState.discardPile[gameState.discardPile.length - 1]
        : null;

    const canEliminate =
      topDiscardCard && topDiscardCard.rank === cardToEliminate.rank;

    const eliminatingPlayerName =
      gameState.players[eliminatingPlayerIndex].name;
    const cardOwnerName = gameState.players[cardOwnerIndex].name;

    if (canEliminate) {
      // Replace with null instead of removing to preserve positions
      const eliminatedCard = gameState.players[cardOwnerIndex].hand[cardIndex];
      if (eliminatedCard) {
        // Type guard to ensure card is not null
        gameState.players[cardOwnerIndex].hand[cardIndex] = null;
        gameState.discardPile.push(eliminatedCard);
        gameState.players[eliminatingPlayerIndex].hasEliminatedThisRound = true;

        gameState.players.forEach((player, idx) => {
          if (idx !== eliminatingPlayerIndex) {
            player.hasEliminatedThisRound = false;
          }
        });

        console.log(
          `✅ ${eliminatingPlayerName} eliminated ${eliminatedCard.rank} from ${cardOwnerName} at position ${cardIndex}`
        );
      }
    } else {
      console.log(`❌ ${eliminatingPlayerName} failed to eliminate - penalty`);
      if (gameState.deck.length > 0) {
        const penaltyCard = gameState.deck.pop()!;
        penaltyCard.isRevealed = false;

        // Find first null position or add to end
        const handLength =
          gameState.players[eliminatingPlayerIndex].hand.length;
        let addedToPosition = false;

        for (let i = 0; i < handLength; i++) {
          if (gameState.players[eliminatingPlayerIndex].hand[i] === null) {
            gameState.players[eliminatingPlayerIndex].hand[i] = penaltyCard;
            penaltyCard.position = i;
            addedToPosition = true;
            break;
          }
        }

        if (!addedToPosition) {
          // No null positions, add to end
          penaltyCard.position = handLength;
          gameState.players[eliminatingPlayerIndex].hand.push(penaltyCard);
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
          gameState.players[player2Index].hand[card2Index]
        ) {
          const card1 = gameState.players[player1Index].hand[card1Index];
          const card2 = gameState.players[player2Index].hand[card2Index];
          const player1Name = gameState.players[player1Index].name;
          const player2Name = gameState.players[player2Index].name;

          if (power === "K") {
            DualPlayerMockSocket.broadcastToPlayer(
              playerId,
              "power-swap-preview",
              {
                card1,
                card2,
                player1Name,
                player2Name,
              }
            );
          }

          // Perform the swap
          gameState.players[player1Index].hand[card1Index] = card2;
          gameState.players[player2Index].hand[card2Index] = card1;

          console.log(
            `🔄 ${playerName} used ${power} power: swapped cards between ${player1Name} and ${player2Name}`
          );

          delete gameState.players[playerIndex].activePower;
          DualPlayerMockSocket.moveToNextPlayer(gameState);
          DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
        }
      }
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
    if (!DualPlayerMockSocket.sharedRooms[roomId]) return;

    const gameState = DualPlayerMockSocket.sharedRooms[roomId];
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return;

    const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return;

    const playerName = gameState.players[playerIndex].name;
    const actualRanks = gameState.players[playerIndex].hand.map(
      (card) => card?.rank
    );
    const isValidDeclaration = declaredRanks.every(
      (rank, index) => actualRanks[index] === rank
    );

    console.log(`🎯 ${playerName} declared:`);
    console.log(`   Declared: [${declaredRanks.join(", ")}]`);
    console.log(`   Actual:   [${actualRanks.join(", ")}]`);
    console.log(`   Valid:    ${isValidDeclaration ? "✅" : "❌"}`);

    gameState.gameStatus = "ended";
    gameState.declarer = playerId;
    gameState.lastAction = { type: "declare", playerId, timestamp: Date.now() };

    gameState.players.forEach((player) => {
      player.hand.forEach((card) => {
        card!.isRevealed = true;
      });
      player.score = player.hand.reduce((sum, card) => sum + card!.value, 0);
    });

    if (!isValidDeclaration) {
      gameState.players[playerIndex].score += 20;
      console.log(`⚠️ ${playerName} gets +20 penalty for invalid declaration`);
    }

    const minScore = Math.min(...gameState.players.map((p) => p.score));
    const winners = gameState.players
      .filter((p) => p.score === minScore)
      .map((p) => ({ id: p.id, name: p.name, score: p.score }));

    console.log(
      `🏆 Game ended! Winners: ${winners
        .map((w) => w.name)
        .join(", ")} (${minScore} points)`
    );

    DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
    DualPlayerMockSocket.broadcastToAll("game-ended", {
      declarer: playerId,
      winners,
      isValidDeclaration,
    });
  }
}

export default DualPlayerMockSocket;
