// utils/DualPlayerMockSocket.ts - Complete implementation with elimination fixes
import { BrowserEventEmitter } from "./BrowserEventEmitter";
import { createDeck, shuffleDeck, type Card } from "./cardUtils";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  hand: (Card | null)[];
  score: number;
  knownCards: string[];
  skippedTurn: boolean;
  hasEliminatedThisRound: boolean;
  activePower?: string;
  isSelectingCardToGive?: boolean; // NEW
}

interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  deck: Card[];
  discardPile: Card[];
  gameStatus: "waiting" | "playing" | "ended";
  matchingDiscardWindow: boolean;
  matchingDiscardCard: Card | null;
  matchingDiscardTimeout: number | null;
  roundNumber: number;
  declarer: string | null;
  lastAction: any;
  eliminationUsedThisRound: boolean; // NEW
  pendingEliminationGive?: {
    // NEW
    eliminatingPlayerId: string;
    targetPlayerId: string;
    targetCardIndex: number;
    eliminatedCard: Card;
  };
}

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
      event === "select-card-to-give" || // NEW
      event === "discard-drawn-card" ||
      event === "swap-card" ||
      event === "declare" ||
      event === "use-power" ||
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
      case "select-card-to-give": // NEW
        this.handleSelectCardToGive(data);
        break;
      case "discard-drawn-card":
        this.handleDiscardDrawnCard(data);
        break;
      case "swap-card":
        this.handleSwapCard(data);
        break;
      case "declare":
        this.handleDeclare(data);
        break;
      case "use-power":
        this.handleUsePower(data);
        break;
      default:
        console.log(`Unhandled event: ${event}`, data);
        break;
    }
  }

  // Handle elimination with all three fixes
  private handleEliminateCard(data: {
    roomId: string;
    playerId: string;
    cardOwnerId: string;
    cardIndex: number;
    cardId: string;
  }): void {
    const { roomId, playerId, cardOwnerId, cardIndex } = data;
    const gameState = DualPlayerMockSocket.sharedRooms[roomId];

    if (!gameState) return;

    // FIX 1: Check global elimination limit
    if (gameState.eliminationUsedThisRound) {
      console.log(`❌ Elimination already used this round - too slow!`);
      DualPlayerMockSocket.broadcastToAll("elimination-too-slow", {
        playerId,
        message: "Elimination window closed - someone else eliminated first",
      });
      return;
    }

    const eliminatingPlayerIndex = gameState.players.findIndex(
      (p) => p.id === playerId
    );
    const cardOwnerIndex = gameState.players.findIndex(
      (p) => p.id === cardOwnerId
    );

    if (eliminatingPlayerIndex === -1 || cardOwnerIndex === -1) return;

    const cardToEliminate = gameState.players[cardOwnerIndex].hand[cardIndex];
    if (!cardToEliminate) return;

    const topDiscardCard =
      gameState.discardPile.length > 0
        ? gameState.discardPile[gameState.discardPile.length - 1]
        : null;

    const canEliminate =
      topDiscardCard && topDiscardCard.rank === cardToEliminate.rank;

    if (canEliminate) {
      // SUCCESSFUL ELIMINATION
      console.log(`✅ Valid elimination: ${cardToEliminate.rank} eliminated`);

      // FIX 1: Mark global elimination as used
      gameState.eliminationUsedThisRound = true;

      const eliminatedCard = gameState.players[cardOwnerIndex].hand[cardIndex];

      // Set up pending card selection for eliminating player
      gameState.pendingEliminationGive = {
        eliminatingPlayerId: playerId,
        targetPlayerId: cardOwnerId,
        targetCardIndex: cardIndex,
        eliminatedCard: eliminatedCard!,
      };

      // FIX 3: Put eliminating player in card selection mode
      gameState.players[eliminatingPlayerIndex].isSelectingCardToGive = true;

      // Discard the eliminated card immediately
      gameState.discardPile.push(eliminatedCard!);
      gameState.players[cardOwnerIndex].hand[cardIndex] = null;

      // Mark individual player as having eliminated
      gameState.players[eliminatingPlayerIndex].hasEliminatedThisRound = true;

      // Emit card selection prompt
      DualPlayerMockSocket.broadcastToAll("select-card-to-give", {
        eliminatingPlayerId: playerId,
        targetPlayerName: gameState.players[cardOwnerIndex].name,
        eliminatedCard: eliminatedCard,
      });

      console.log(
        `🎯 ${gameState.players[eliminatingPlayerIndex].name} must choose a card to give`
      );
    } else {
      // FAILED ELIMINATION
      console.log(
        `❌ Invalid elimination - ${cardToEliminate.rank} doesn't match ${topDiscardCard?.rank}`
      );

      // Give penalty card
      if (gameState.deck.length > 0) {
        const penaltyCard = gameState.deck.pop()!;
        penaltyCard.isRevealed = false;

        // Add penalty card to eliminating player's hand
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
          penaltyCard.position = handLength;
          gameState.players[eliminatingPlayerIndex].hand.push(penaltyCard);
        }

        DualPlayerMockSocket.broadcastToAll("penalty-card", {
          playerId,
          penaltyCard,
          reason: "Invalid elimination attempt",
        });
      }

      // FIX 1: Wrong elimination does NOT block further elimination attempts
      // (don't set eliminationUsedThisRound = true)

      // Mark individual player as having attempted (prevents spam)
      gameState.players[eliminatingPlayerIndex].hasEliminatedThisRound = true;
    }

    gameState.lastAction = {
      type: "eliminate",
      playerId,
      targetPlayerId: cardOwnerId,
      targetCardIndex: cardIndex,
      timestamp: Date.now(),
    };

    DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
  }

  // NEW: Handle card selection for giving
  private handleSelectCardToGive(data: {
    roomId: string;
    playerId: string;
    cardIndex: number;
  }): void {
    const { roomId, playerId, cardIndex } = data;
    const gameState = DualPlayerMockSocket.sharedRooms[roomId];

    if (!gameState) return;

    const pending = gameState.pendingEliminationGive;

    if (!pending || pending.eliminatingPlayerId !== playerId) return;

    const eliminatingPlayerIndex = gameState.players.findIndex(
      (p) => p.id === playerId
    );
    const targetPlayerIndex = gameState.players.findIndex(
      (p) => p.id === pending.targetPlayerId
    );

    if (eliminatingPlayerIndex === -1 || targetPlayerIndex === -1) return;

    const cardToGive =
      gameState.players[eliminatingPlayerIndex].hand[cardIndex];

    if (!cardToGive) {
      console.log(`❌ Cannot give eliminated card at position ${cardIndex}`);
      DualPlayerMockSocket.broadcastToAll("invalid-card-selection", {
        playerId,
        message: "Cannot give eliminated card",
      });
      return;
    }

    // Transfer the chosen card
    gameState.players[targetPlayerIndex].hand[pending.targetCardIndex] =
      cardToGive;
    cardToGive.position = pending.targetCardIndex;

    // Remove from eliminating player's hand
    gameState.players[eliminatingPlayerIndex].hand[cardIndex] = null;

    // Clear selection state
    gameState.players[eliminatingPlayerIndex].isSelectingCardToGive = false;
    delete gameState.pendingEliminationGive;

    console.log(
      `🔄 Card transfer completed: ${cardToGive.rank} given to ${gameState.players[targetPlayerIndex].name}`
    );

    // Emit completion event
    DualPlayerMockSocket.broadcastToAll("elimination-card-transfer", {
      eliminatingPlayerId: playerId,
      eliminatingPlayerName: gameState.players[eliminatingPlayerIndex].name,
      cardOwnerId: pending.targetPlayerId,
      cardOwnerName: gameState.players[targetPlayerIndex].name,
      eliminatedCard: pending.eliminatedCard,
      givenCard: cardToGive,
      position: pending.targetCardIndex,
    });

    DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
  }

  private handleJoinRoom(data: { roomId: string; playerName: string }): void {
    const { roomId, playerName } = data;
    console.log(`🚪 [${this.id}] Joining room: ${roomId} as ${playerName}`);

    if (!DualPlayerMockSocket.sharedRooms[roomId]) {
      // Create new game
      const deck = shuffleDeck(createDeck());
      const player1Hand = deck.splice(0, 4);
      const player2Hand = deck.splice(0, 4);

      player1Hand.forEach((card, index) => {
        card.position = index;
        card.isRevealed = false;
      });
      player2Hand.forEach((card, index) => {
        card.position = index;
        card.isRevealed = false;
      });

      DualPlayerMockSocket.sharedRooms[roomId] = {
        players: [
          {
            id: "player1",
            name: "Player 1",
            isHost: true,
            hand: player1Hand,
            score: 0,
            knownCards: [],
            skippedTurn: false,
            hasEliminatedThisRound: false,
          },
          {
            id: "player2",
            name: "Player 2",
            isHost: false,
            hand: player2Hand,
            score: 0,
            knownCards: [],
            skippedTurn: false,
            hasEliminatedThisRound: false,
          },
        ],
        currentPlayerIndex: 0,
        deck,
        discardPile: [],
        gameStatus: "playing",
        matchingDiscardWindow: false,
        matchingDiscardCard: null,
        matchingDiscardTimeout: null,
        roundNumber: 1,
        declarer: null,
        lastAction: null,
        eliminationUsedThisRound: false, // NEW
      };

      DualPlayerMockSocket.broadcastToAll("player-joined", {
        roomId,
        name: playerName,
        id: this.id,
      });
    } else {
      // Update existing player name if needed
      const existingPlayer = DualPlayerMockSocket.sharedRooms[
        roomId
      ].players.find((p) => p.id === this.id);
      if (existingPlayer && existingPlayer.name !== playerName) {
        console.log(
          `🔄 Player ${this.id} already in room, updating name to ${playerName}`
        );
        existingPlayer.name = playerName;

        DualPlayerMockSocket.broadcastToAll("player-joined", {
          roomId,
          name: playerName,
          id: this.id,
        });
      }
    }

    DualPlayerMockSocket.broadcastToAll(
      "game-state-update",
      DualPlayerMockSocket.sharedRooms[roomId]
    );
  }

  private handleStartGame(data: { roomId: string }): void {
    // Game already starts when room is created
    DualPlayerMockSocket.broadcastToAll(
      "game-state-update",
      DualPlayerMockSocket.sharedRooms[data.roomId]
    );
  }

  private handleDrawCard(data: { roomId: string; playerId: string }): void {
    const gameState = DualPlayerMockSocket.sharedRooms[data.roomId];
    if (!gameState || gameState.deck.length === 0) return;

    const drawnCard = gameState.deck.pop()!;
    DualPlayerMockSocket.drawnCards[data.playerId] = drawnCard;

    DualPlayerMockSocket.broadcastToAll("card-drawn", {
      playerId: data.playerId,
      card: drawnCard,
    });

    DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
  }

  private handleSwapCard(data: {
    roomId: string;
    playerId: string;
    cardIndex: number;
    drawnCardId: string;
  }): void {
    const gameState = DualPlayerMockSocket.sharedRooms[data.roomId];
    if (!gameState) return;

    const drawnCard = DualPlayerMockSocket.drawnCards[data.playerId];
    if (!drawnCard) return;

    const playerIndex = gameState.players.findIndex(
      (p) => p.id === data.playerId
    );
    if (playerIndex === -1) return;

    const oldCard = gameState.players[playerIndex].hand[data.cardIndex];
    if (oldCard) {
      gameState.discardPile.push(oldCard);
    }

    gameState.players[playerIndex].hand[data.cardIndex] = drawnCard;
    drawnCard.position = data.cardIndex;

    delete DualPlayerMockSocket.drawnCards[data.playerId];

    // FIX 1: Reset elimination tracking when new card is discarded
    gameState.eliminationUsedThisRound = false;
    gameState.players.forEach((player) => {
      player.hasEliminatedThisRound = false;
    });

    DualPlayerMockSocket.moveToNextPlayer(gameState);
    DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
  }

  // Updated discard logic with FIX 2
  private handleDiscardDrawnCard(data: {
    roomId: string;
    playerId: string;
    cardId: string;
  }): void {
    const gameState = DualPlayerMockSocket.sharedRooms[data.roomId];
    if (!gameState) return;

    // Check if it's player's turn
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== data.playerId) return;

    // Get the actual drawn card for this player
    const drawnCard = DualPlayerMockSocket.drawnCards[data.playerId];
    if (!drawnCard) {
      console.error("No drawn card found for player:", data.playerId);
      return;
    }

    // Add the actual drawn card to discard pile
    gameState.discardPile.push(drawnCard);
    console.log(`Discarded ${drawnCard.rank} of ${drawnCard.suit}`);

    // FIX 1: Reset GLOBAL elimination tracking when new card is discarded
    gameState.eliminationUsedThisRound = false;

    // Reset individual player elimination tracking
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

    // FIX 2: Apply card powers for 7, 8, 9, 10, Q, K when discarded but allow elimination
    if (["7", "8", "9", "10", "Q", "K"].includes(drawnCard.rank)) {
      const playerIndex = gameState.players.findIndex(
        (p) => p.id === data.playerId
      );
      if (playerIndex !== -1) {
        gameState.players[playerIndex].activePower = drawnCard.rank;
        console.log(
          `${drawnCard.rank} power activated for ${gameState.players[playerIndex].name}`
        );
        console.log(
          `Elimination also available if other players want to match ${drawnCard.rank}`
        );

        // FIX 2: Don't force power usage - allow elimination too
        // Players can either use power OR eliminate, or power THEN eliminate

        // Don't move to next player yet - wait for power to be used OR player to pass
        delete DualPlayerMockSocket.drawnCards[data.playerId];

        gameState.lastAction = {
          type: "discard",
          playerId: data.playerId,
          cardId: data.cardId,
          timestamp: Date.now(),
        };

        DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
        return;
      }
    }

    // Move to next player for non-power cards or after power usage
    DualPlayerMockSocket.moveToNextPlayer(gameState);
    delete DualPlayerMockSocket.drawnCards[data.playerId];

    gameState.lastAction = {
      type: "discard",
      playerId: data.playerId,
      cardId: data.cardId,
      timestamp: Date.now(),
    };

    DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
  }

  private handleUsePower(data: {
    roomId: string;
    playerId: string;
    power: string;
    targetPlayerId?: string;
    targetCardIndex?: number;
    swapSelections?: Array<{ playerId: string; cardIndex: number }>;
  }): void {
    const gameState = DualPlayerMockSocket.sharedRooms[data.roomId];
    if (!gameState) return;

    const playerIndex = gameState.players.findIndex(
      (p) => p.id === data.playerId
    );
    if (playerIndex === -1) return;

    // Clear the power after use
    delete gameState.players[playerIndex].activePower;

    switch (data.power) {
      case "7":
      case "8":
        // Peek at own card
        if (
          data.targetPlayerId === data.playerId &&
          data.targetCardIndex !== undefined
        ) {
          const card =
            gameState.players[playerIndex].hand[data.targetCardIndex];
          if (card) {
            DualPlayerMockSocket.broadcastToAll("power-peek-result", {
              peeker: data.playerId,
              targetPlayerId: data.targetPlayerId,
              targetCardIndex: data.targetCardIndex,
              card: card,
            });
          }
        }
        break;

      case "9":
      case "10":
        // Peek at opponent's card
        if (data.targetPlayerId && data.targetCardIndex !== undefined) {
          const targetPlayerIndex = gameState.players.findIndex(
            (p) => p.id === data.targetPlayerId
          );
          if (targetPlayerIndex !== -1) {
            const card =
              gameState.players[targetPlayerIndex].hand[data.targetCardIndex];
            if (card) {
              DualPlayerMockSocket.broadcastToAll("power-peek-result", {
                peeker: data.playerId,
                targetPlayerId: data.targetPlayerId,
                targetCardIndex: data.targetCardIndex,
                card: card,
              });
            }
          }
        }
        break;

      case "Q":
        // Unseen swap
        if (data.swapSelections && data.swapSelections.length === 2) {
          const sel1 = data.swapSelections[0];
          const sel2 = data.swapSelections[1];

          const player1Index = gameState.players.findIndex(
            (p) => p.id === sel1.playerId
          );
          const player2Index = gameState.players.findIndex(
            (p) => p.id === sel2.playerId
          );

          if (player1Index !== -1 && player2Index !== -1) {
            const card1 = gameState.players[player1Index].hand[sel1.cardIndex];
            const card2 = gameState.players[player2Index].hand[sel2.cardIndex];

            if (card1 && card2) {
              // Swap the cards
              gameState.players[player1Index].hand[sel1.cardIndex] = card2;
              gameState.players[player2Index].hand[sel2.cardIndex] = card1;

              card1.position = sel2.cardIndex;
              card2.position = sel1.cardIndex;
            }
          }
        }
        break;

      case "K":
        // Seen swap - reveal cards first
        if (data.swapSelections && data.swapSelections.length === 2) {
          const sel1 = data.swapSelections[0];
          const sel2 = data.swapSelections[1];

          const player1Index = gameState.players.findIndex(
            (p) => p.id === sel1.playerId
          );
          const player2Index = gameState.players.findIndex(
            (p) => p.id === sel2.playerId
          );

          if (player1Index !== -1 && player2Index !== -1) {
            const card1 = gameState.players[player1Index].hand[sel1.cardIndex];
            const card2 = gameState.players[player2Index].hand[sel2.cardIndex];

            if (card1 && card2) {
              // Reveal cards to all players first
              DualPlayerMockSocket.broadcastToAll("king-power-reveal", {
                powerUserId: data.playerId,
                card1: {
                  playerId: sel1.playerId,
                  cardIndex: sel1.cardIndex,
                  card: card1,
                },
                card2: {
                  playerId: sel2.playerId,
                  cardIndex: sel2.cardIndex,
                  card: card2,
                },
              });

              // Swap after a delay
              setTimeout(() => {
                gameState.players[player1Index].hand[sel1.cardIndex] = card2;
                gameState.players[player2Index].hand[sel2.cardIndex] = card1;

                card1.position = sel2.cardIndex;
                card2.position = sel1.cardIndex;

                DualPlayerMockSocket.broadcastToAll("power-swap-completed", {
                  powerUserId: data.playerId,
                  powerUserName: gameState.players[playerIndex].name,
                  power: data.power,
                  swapDetails: {
                    player1Name: gameState.players[player1Index].name,
                    player2Name: gameState.players[player2Index].name,
                    card1Rank: card2.rank,
                    card2Rank: card1.rank,
                  },
                });

                DualPlayerMockSocket.broadcastToAll(
                  "game-state-update",
                  gameState
                );
              }, 2000);
              return;
            }
          }
        }
        break;
    }

    // Move to next player after power use (except for King which has delay)
    if (data.power !== "K") {
      DualPlayerMockSocket.moveToNextPlayer(gameState);
    }

    DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
  }

  private handleDeclare(data: {
    roomId: string;
    playerId: string;
    declaredRanks: string[];
  }): void {
    const gameState = DualPlayerMockSocket.sharedRooms[data.roomId];
    if (!gameState) return;

    const playerIndex = gameState.players.findIndex(
      (p) => p.id === data.playerId
    );
    if (playerIndex === -1) return;

    const player = gameState.players[playerIndex];
    const actualCards = player.hand.filter((card) => card !== null) as Card[];
    const actualRanks = actualCards.map((card) => card.rank);

    console.log(`🎯 Declaration by ${player.name}:`);
    console.log(
      `   Hand: [${player.hand
        .map((card) => (card ? card.rank : "ELIMINATED"))
        .join(", ")}]`
    );
    console.log(
      `   Actual cards: ${actualCards.length} (${actualRanks.join(", ")})`
    );
    console.log(`   Declared: [${data.declaredRanks.join(", ")}]`);
    console.log(`   Expected: [${actualRanks.join(", ")}]`);

    // Validate declaration - should match actual cards only
    const isValidDeclaration =
      data.declaredRanks.length === actualCards.length &&
      data.declaredRanks.every((rank, index) => actualRanks[index] === rank);

    console.log(`   Valid: ${isValidDeclaration ? "✅" : "❌"}`);

    // End the game
    gameState.gameStatus = "ended";
    gameState.declarer = data.playerId;
    gameState.lastAction = {
      type: "declare",
      playerId: data.playerId,
      timestamp: Date.now(),
    };

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
      console.log(`⚠️ ${player.name} gets +20 penalty for invalid declaration`);
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
          .map((c) => `${c!.rank}=${c!.value}`)
          .join(", ")}) + ${eliminatedCount} eliminated = ${player.score} total`
      );
    });

    DualPlayerMockSocket.broadcastToAll("game-state-update", gameState);
    DualPlayerMockSocket.broadcastToAll("game-ended", {
      declarer: data.playerId,
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

  private handleLeaveRoom(data: { roomId: string }): void {
    // Handle leaving room logic if needed
    console.log(`[${this.id}] Leaving room: ${data.roomId}`);
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
}

export default DualPlayerMockSocket;
