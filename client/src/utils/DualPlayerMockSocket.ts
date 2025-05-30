// client/src/utils/DualPlayerMockSocket.ts - Two players on same device
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
    console.log("DualPlayerMockSocket initialized with ID:", this.id);
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
    DualPlayerMockSocket.instances.forEach((instance) => {
      instance.emitToSelf(event, data);
    });
  }

  // Broadcast to specific player
  private static broadcastToPlayer(
    playerId: string,
    event: string,
    data: any
  ): void {
    const instance = DualPlayerMockSocket.instances.get(playerId);
    if (instance) {
      instance.emitToSelf(event, data);
    }
  }

  private static moveToNextPlayer(gameState: GameState): void {
    if (!gameState.players.length) return;

    console.log(
      `[TURN DEBUG] Current player before move: ${
        gameState.players[gameState.currentPlayerIndex].name
      } (index ${gameState.currentPlayerIndex})`
    );

    let nextPlayerIndex =
      (gameState.currentPlayerIndex + 1) % gameState.players.length;

    let attempts = 0;
    while (
      gameState.players[nextPlayerIndex]?.skippedTurn &&
      attempts < gameState.players.length
    ) {
      console.log(
        `[TURN DEBUG] Player ${gameState.players[nextPlayerIndex].name} turn skipped`
      );
      gameState.players[nextPlayerIndex].skippedTurn = false;
      nextPlayerIndex = (nextPlayerIndex + 1) % gameState.players.length;
      attempts++;
    }

    gameState.currentPlayerIndex = nextPlayerIndex;
    console.log(
      `[TURN DEBUG] Final turn assignment: ${gameState.players[nextPlayerIndex].name}`
    );
  }

  getId(): string {
    return this.id;
  }

  setId(id: string): void {
    // Remove old instance and create new one with new ID
    DualPlayerMockSocket.instances.delete(this.id);
    this.id = id;
    DualPlayerMockSocket.instances.set(id, this);
    console.log("DualPlayerMockSocket ID changed to:", this.id);
  }

  private emitToSelf(event: string, data: any): void {
    super.emit(event, data);
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
    }

    const gameState = DualPlayerMockSocket.sharedRooms[roomId];
    const existingPlayerIndex = gameState.players.findIndex(
      (p) => p.id === this.id
    );

    if (existingPlayerIndex >= 0) {
      console.log(`Player with ID ${this.id} already in room, updating name`);
      gameState.players[existingPlayerIndex].name = playerName;
    } else {
      const isHost = gameState.players.length === 0;
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
    if (!DualPlayerMockSocket.sharedRooms[roomId]) return;

    const gameState = DualPlayerMockSocket.sharedRooms[roomId];
    gameState.players = gameState.players.filter(
      (player) => player.id !== playerId
    );

    if (gameState.players.length === 0) {
      delete DualPlayerMockSocket.sharedRooms[roomId];
    } else {
      if (!gameState.players.some((player) => player.isHost)) {
        gameState.players[0].isHost = true;
      }
      DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
    }
  }

  private handleStartGame({ roomId }: { roomId: string }): void {
    console.log(`[${this.id}] Start game requested for room ${roomId}`);

    if (!DualPlayerMockSocket.sharedRooms[roomId]) {
      console.error(`No room found with ID ${roomId}`);
      return;
    }

    const gameState = DualPlayerMockSocket.sharedRooms[roomId];
    const playerCount = gameState.players.length;

    const requestingPlayer = gameState.players.find((p) => p.id === this.id);
    if (!requestingPlayer?.isHost) {
      console.log("Only host can start the game");
      DualPlayerMockSocket.broadcastToPlayer(this.id, "error", {
        message: "Only host can start the game",
      });
      return;
    }

    console.log(`Starting game with ${playerCount} players`);

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

    DualPlayerMockSocket.drawnCards = {};

    DualPlayerMockSocket.broadcastToAll("start-game", { roomId });
    DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);

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
    if (!DualPlayerMockSocket.sharedRooms[roomId]) return;

    const gameState = DualPlayerMockSocket.sharedRooms[roomId];
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      console.log(
        `Not ${playerId}'s turn, current player is ${currentPlayer.id}`
      );
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

      DualPlayerMockSocket.broadcastToPlayer(playerId, "card-drawn", drawnCard);
      DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
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
      console.error("No drawn card found for player:", playerId);
      return;
    }

    gameState.discardPile.push(drawnCard);
    console.log(`Discarded ${drawnCard.rank} of ${drawnCard.suit}`);

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
        `[JACK POWER] Jack played, skipping ${gameState.players[nextPlayerIndex].name}`
      );
    }

    if (["7", "8", "9", "10", "Q", "K"].includes(drawnCard.rank)) {
      const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
      if (playerIndex !== -1) {
        gameState.players[playerIndex].activePower = drawnCard.rank;
        console.log(
          `${drawnCard.rank} power activated for ${gameState.players[playerIndex].name}`
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
      (c) => c.id === handCardId
    );

    if (playerIndex !== -1 && cardIndex !== -1) {
      const drawnCard = DualPlayerMockSocket.drawnCards[playerId];
      if (!drawnCard) {
        console.error("No drawn card found for player:", playerId);
        return;
      }

      const handCard = gameState.players[playerIndex].hand[cardIndex];
      drawnCard.isRevealed = false;
      gameState.players[playerIndex].hand[cardIndex] = drawnCard;
      gameState.discardPile.push(handCard);

      gameState.players.forEach((player) => {
        player.hasEliminatedThisRound = false;
      });

      delete DualPlayerMockSocket.drawnCards[playerId];

      console.log(
        `Swapped: drawn ${drawnCard.rank} → hand, hand ${handCard.rank} → discard`
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
      console.log("Player has already eliminated a card this round");
      return;
    }

    // Find card owner
    let cardOwnerIndex = -1;
    let cardIndex = -1;
    let cardToEliminate = null;

    for (let i = 0; i < gameState.players.length; i++) {
      const foundCardIndex = gameState.players[i].hand.findIndex(
        (c) => c.id === cardId
      );
      if (foundCardIndex !== -1) {
        cardOwnerIndex = i;
        cardIndex = foundCardIndex;
        cardToEliminate = gameState.players[i].hand[foundCardIndex];
        break;
      }
    }

    if (cardOwnerIndex === -1 || !cardToEliminate) return;

    const topDiscardCard =
      gameState.discardPile.length > 0
        ? gameState.discardPile[gameState.discardPile.length - 1]
        : null;

    const canEliminate =
      topDiscardCard && topDiscardCard.rank === cardToEliminate.rank;

    if (canEliminate) {
      const eliminatedCard = gameState.players[cardOwnerIndex].hand.splice(
        cardIndex,
        1
      )[0];
      gameState.discardPile.push(eliminatedCard);
      gameState.players[eliminatingPlayerIndex].hasEliminatedThisRound = true;

      gameState.players.forEach((player, idx) => {
        if (idx !== eliminatingPlayerIndex) {
          player.hasEliminatedThisRound = false;
        }
      });

      console.log(
        `${gameState.players[eliminatingPlayerIndex].name} eliminated ${eliminatedCard.rank} from ${gameState.players[cardOwnerIndex].name}'s hand`
      );
    } else {
      console.log("Invalid elimination - penalty");
      if (gameState.deck.length > 0) {
        const penaltyCard = gameState.deck.pop()!;
        penaltyCard.isRevealed = false;
        gameState.players[eliminatingPlayerIndex].hand.push(penaltyCard);

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

      if (
        ["7", "8"].includes(power) &&
        gameState.players[playerIndex].hand[cardIndex]
      ) {
        const card = gameState.players[playerIndex].hand[cardIndex];

        DualPlayerMockSocket.broadcastToPlayer(playerId, "power-peek-result", {
          card,
          targetPlayer: `${gameState.players[playerIndex].name} (You)`,
          cardIndex,
        });

        if (!gameState.players[playerIndex].knownCards.includes(card.id)) {
          gameState.players[playerIndex].knownCards.push(card.id);
        }

        console.log(
          `${power} power used: ${gameState.players[playerIndex].name} peeked at own ${card.rank}`
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

      if (
        ["9", "10"].includes(power) &&
        gameState.players[targetPlayerIndex].hand[cardIndex]
      ) {
        const card = gameState.players[targetPlayerIndex].hand[cardIndex];

        DualPlayerMockSocket.broadcastToPlayer(playerId, "power-peek-result", {
          card,
          targetPlayer: gameState.players[targetPlayerIndex].name,
          targetPlayerId: targetPlayerId,
          cardIndex,
        });

        if (!gameState.players[playerIndex].knownCards.includes(card.id)) {
          gameState.players[playerIndex].knownCards.push(card.id);
        }

        console.log(
          `${power} power used: ${gameState.players[playerIndex].name} peeked at ${gameState.players[targetPlayerIndex].name}'s ${card.rank}`
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

          if (power === "K") {
            DualPlayerMockSocket.broadcastToPlayer(
              playerId,
              "power-swap-preview",
              {
                card1,
                card2,
                player1Name: gameState.players[player1Index].name,
                player2Name: gameState.players[player2Index].name,
              }
            );
          }

          // Perform the swap
          gameState.players[player1Index].hand[card1Index] = card2;
          gameState.players[player2Index].hand[card2Index] = card1;

          console.log(
            `${power} power used: swapped cards between ${gameState.players[player1Index].name} and ${gameState.players[player2Index].name}`
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

    const actualRanks = gameState.players[playerIndex].hand.map(
      (card) => card.rank
    );
    const isValidDeclaration = declaredRanks.every(
      (rank, index) => actualRanks[index] === rank
    );

    console.log("Declared ranks:", declaredRanks);
    console.log("Actual ranks:", actualRanks);
    console.log("Is valid:", isValidDeclaration);

    gameState.gameStatus = "ended";
    gameState.declarer = playerId;
    gameState.lastAction = { type: "declare", playerId, timestamp: Date.now() };

    gameState.players.forEach((player) => {
      player.hand.forEach((card) => {
        card.isRevealed = true;
      });
      player.score = player.hand.reduce((sum, card) => sum + card.value, 0);
    });

    if (!isValidDeclaration) {
      gameState.players[playerIndex].score += 20;
    }

    const minScore = Math.min(...gameState.players.map((p) => p.score));
    const winners = gameState.players
      .filter((p) => p.score === minScore)
      .map((p) => ({ id: p.id, name: p.name, score: p.score }));

    DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
    DualPlayerMockSocket.broadcastToAll("game-ended", {
      declarer: playerId,
      winners,
      isValidDeclaration,
    });
  }
}

export default DualPlayerMockSocket;
