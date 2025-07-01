// utils/MockSocket.ts - Updated with elimination fixes
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
  pendingEliminationGive?: { // NEW
    eliminatingPlayerId: string;
    targetPlayerId: string;
    targetCardIndex: number;
    eliminatedCard: Card;
  };
}

class MockSocket {
  private eventHandlers: Map<string, Function[]> = new Map();
  private roomId: string = "QUICK";
  private rooms: Map<string, GameState> = new Map();
  private drawnCards: Map<string, Card> = new Map();

  constructor() {
    // Initialize with empty game
  }

  // Handle elimination with all three fixes
  private handleEliminateCard({
    roomId,
    playerId,
    cardOwnerId,
    cardIndex,
    cardId,
  }: {
    roomId: string;
    playerId: string;
    cardOwnerId: string;
    cardIndex: number;
    cardId: string;
  }): void {
    if (!this.rooms.has(roomId)) return;

    const gameState = this.rooms.get(roomId)!;

    // FIX 1: Check global elimination limit
    if (gameState.eliminationUsedThisRound) {
      console.log(`❌ Elimination already used this round - too slow!`);
      this.emitToAll("elimination-too-slow", {
        playerId,
        message: "Elimination window closed - someone else eliminated first"
      });
      return;
    }

    const eliminatingPlayerIndex = gameState.players.findIndex(p => p.id === playerId);
    const cardOwnerIndex = gameState.players.findIndex(p => p.id === cardOwnerId);

    if (eliminatingPlayerIndex === -1 || cardOwnerIndex === -1) return;

    const cardToEliminate = gameState.players[cardOwnerIndex].hand[cardIndex];
    if (!cardToEliminate) return;

    const topDiscardCard = gameState.discardPile.length > 0
      ? gameState.discardPile[gameState.discardPile.length - 1]
      : null;

    const canEliminate = topDiscardCard && topDiscardCard.rank === cardToEliminate.rank;

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
        eliminatedCard: eliminatedCard!
      };

      // FIX 3: Put eliminating player in card selection mode
      gameState.players[eliminatingPlayerIndex].isSelectingCardToGive = true;

      // Discard the eliminated card immediately
      gameState.discardPile.push(eliminatedCard!);
      gameState.players[cardOwnerIndex].hand[cardIndex] = null;

      // Mark individual player as having eliminated
      gameState.players[eliminatingPlayerIndex].hasEliminatedThisRound = true;

      // Emit card selection prompt
      this.emitToAll("select-card-to-give", {
        eliminatingPlayerId: playerId,
        targetPlayerName: gameState.players[cardOwnerIndex].name,
        eliminatedCard: eliminatedCard
      });

      console.log(`🎯 ${gameState.players[eliminatingPlayerIndex].name} must choose a card to give`);

    } else {
      // FAILED ELIMINATION
      console.log(`❌ Invalid elimination - ${cardToEliminate.rank} doesn't match ${topDiscardCard?.rank}`);

      // Give penalty card
      if (gameState.deck.length > 0) {
        const penaltyCard = gameState.deck.pop()!;
        penaltyCard.isRevealed = false;

        // Add penalty card to eliminating player's hand
        const handLength = gameState.players[eliminatingPlayerIndex].hand.length;
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

        this.emitToAll("penalty-card", {
          playerId,
          penaltyCard,
          reason: "Invalid elimination attempt"
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

    this.rooms.set(roomId, gameState);
    this.emitToAll("game-state-update", gameState);
  }

  // NEW: Handle card selection for giving
  private handleSelectCardToGive({
    roomId,
    playerId,
    cardIndex
  }: {
    roomId: string;
    playerId: string;
    cardIndex: number;
  }): void {
    if (!this.rooms.has(roomId)) return;

    const gameState = this.rooms.get(roomId)!;
    const pending = gameState.pendingEliminationGive;
    
    if (!pending || pending.eliminatingPlayerId !== playerId) return;

    const eliminatingPlayerIndex = gameState.players.findIndex(p => p.id === playerId);
    const targetPlayerIndex = gameState.players.findIndex(p => p.id === pending.targetPlayerId);
    
    if (eliminatingPlayerIndex === -1 || targetPlayerIndex === -1) return;

    const cardToGive = gameState.players[eliminatingPlayerIndex].hand[cardIndex];
    
    if (!cardToGive) {
      console.log(`❌ Cannot give eliminated card at position ${cardIndex}`);
      this.emitToAll("invalid-card-selection", {
        playerId,
        message: "Cannot give eliminated card"
      });
      return;
    }

    // Transfer the chosen card
    gameState.players[targetPlayerIndex].hand[pending.targetCardIndex] = cardToGive;
    cardToGive.position = pending.targetCardIndex;
    
    // Remove from eliminating player's hand
    gameState.players[eliminatingPlayerIndex].hand[cardIndex] = null;
    
    // Clear selection state
    gameState.players[eliminatingPlayerIndex].isSelectingCardToGive = false;
    delete gameState.pendingEliminationGive;

    console.log(`🔄 Card transfer completed: ${cardToGive.rank} given to ${gameState.players[targetPlayerIndex].name}`);

    // Emit completion event
    this.emitToAll("elimination-card-transfer", {
      eliminatingPlayerId: playerId,
      eliminatingPlayerName: gameState.players[eliminatingPlayerIndex].name,
      cardOwnerId: pending.targetPlayerId,
      cardOwnerName: gameState.players[targetPlayerIndex].name,
      eliminatedCard: pending.eliminatedCard,
      givenCard: cardToGive,
      position: pending.targetCardIndex
    });

    this.rooms.set(roomId, gameState);
    this.emitToAll("game-state-update", gameState);
  }

  // Updated discard logic with FIX 2
  private handleDiscardDrawnCard({
    roomId,
    playerId,
    cardId,
  }: {
    roomId: string;
    playerId: string;
    cardId: string;
  }): void {
    if (!this.rooms.has(roomId)) return;

    const gameState = this.rooms.get(roomId)!;

    // Check if it's player's turn
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return;

    // Get the actual drawn card for this player
    const drawnCard = this.drawnCards.get(playerId);
    if (!drawnCard) {
      console.error("No drawn card found for player:", playerId);
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
      // Set power mode for the player who discarded
      const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
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
        this.drawnCards.delete(playerId);

        gameState.lastAction = {
          type: "discard",
          playerId,
          cardId,
          timestamp: Date.now(),
        };

        this.rooms.set(roomId, gameState);
        this.emitToAll("game-state-update", gameState);
        return;
      }
    }

    // Move to next player for non-power cards or after power usage
    this.moveToNextPlayer(gameState);
    this.drawnCards.delete(playerId);

    gameState.lastAction = {
      type: "discard",
      playerId,
      cardId,
      timestamp: Date.now(),
    };

    this.rooms.set(roomId, gameState);
    this.emitToAll("game-state-update", gameState);
  }

  private moveToNextPlayer(gameState: GameState): void {
    let nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    
    while (gameState.players[nextPlayerIndex]?.skippedTurn) {
      gameState.players[nextPlayerIndex].skippedTurn = false;
      nextPlayerIndex = (nextPlayerIndex + 1) % gameState.players.length;
    }
    
    gameState.currentPlayerIndex = nextPlayerIndex;
  }

  private emitToAll(event: string, data: any): void {
    console.log(`📡 Broadcasting ${event} to all players`, data);
    
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event)!.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  // Event handling methods
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: Function): void {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event)!;
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event: string, data?: any): void {
    console.log(`📤 Emitting: ${event}`, data);
    
    // Handle events based on type
    switch (event) {
      case "eliminate-card":
        this.handleEliminateCard({
          roomId: data.roomId,
          playerId: data.playerId,
          cardOwnerId: data.cardOwnerId,
          cardIndex: data.cardIndex,
          cardId: data.cardId
        });
        break;