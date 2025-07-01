// utils/gameLogic.ts - Updated to support elimination fixes
import { type Card, cardsMatch } from "./cardUtils";

export type GameState = {
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
  lastAction: GameAction | null;
  eliminationUsedThisRound: boolean; // NEW: Global elimination tracking
  pendingEliminationGive?: {
    // NEW: Card selection for giving
    eliminatingPlayerId: string;
    targetPlayerId: string;
    targetCardIndex: number;
    eliminatedCard: Card;
  };
  type: "view";
};

export type Player = {
  id: string;
  name: string;
  isHost: boolean;
  hand: (Card | null)[]; // Allow null cards for eliminated positions
  score: number;
  knownCards: string[]; // IDs of cards the player has seen
  skippedTurn: boolean;
  hasEliminatedThisRound: boolean; // Track if player has eliminated a card this round
  activePower?: string; // Current active power (7,8,9,10,Q,K)
  isSelectingCardToGive?: boolean; // NEW: In card selection mode for giving
};

export type GameAction = {
  type:
    | "draw"
    | "swap"
    | "discard"
    | "declare"
    | "eliminate"
    | "select-give"
    | "view";
  playerId: string;
  cardId?: string;
  targetPlayerId?: string;
  targetCardIndex?: number;
  timestamp: number;
};

// Initialize game state
export const initGameState = (
  players: { id: string; name: string; isHost: boolean }[]
): GameState => {
  return {
    players: players.map((player) => ({
      ...player,
      hand: [],
      score: 0,
      knownCards: [],
      skippedTurn: false,
      hasEliminatedThisRound: false, // Initialize elimination tracking
    })),
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
    eliminationUsedThisRound: false, // NEW: Initialize global elimination tracking
    type: "view",
  };
};

// Handle card power effects
export const applyCardPower = (
  gameState: GameState,
  card: Card,
  playerId: string
): GameState => {
  const newState = { ...gameState };

  switch (card.rank) {
    case "J":
      // Jack: Skip the next player's turn
      const nextPlayerIndex =
        (newState.currentPlayerIndex + 1) % newState.players.length;
      newState.players[nextPlayerIndex].skippedTurn = true;
      break;

    case "Q":
      // Queen: Unseen swap - handled in UI when a queen is played
      break;

    case "K":
      // King: Seen swap - handled in UI when a king is played
      break;

    case "7":
    case "8":
      // 7/8: Look at one of your own cards - handled in UI
      break;

    case "9":
    case "10":
      // 9/10: Look at one of opponent's cards - handled in UI
      break;

    default:
      // No special power
      break;
  }

  return newState;
};

// Process elimination logic with all fixes
export const processElimination = (
  gameState: GameState,
  eliminatingPlayerId: string,
  targetPlayerId: string,
  targetCardIndex: number,
  cardId: string
): {
  success: boolean;
  newState: GameState;
  message: string;
} => {
  const newState = { ...gameState };

  // FIX 1: Check global elimination limit
  if (newState.eliminationUsedThisRound) {
    return {
      success: false,
      newState,
      message: "Elimination already used this round - too slow!",
    };
  }

  const eliminatingPlayerIndex = newState.players.findIndex(
    (p) => p.id === eliminatingPlayerId
  );
  const targetPlayerIndex = newState.players.findIndex(
    (p) => p.id === targetPlayerId
  );

  if (eliminatingPlayerIndex === -1 || targetPlayerIndex === -1) {
    return {
      success: false,
      newState,
      message: "Invalid player IDs",
    };
  }

  const cardToEliminate =
    newState.players[targetPlayerIndex].hand[targetCardIndex];
  if (!cardToEliminate) {
    return {
      success: false,
      newState,
      message: "No card at target position",
    };
  }

  const topDiscardCard =
    newState.discardPile.length > 0
      ? newState.discardPile[newState.discardPile.length - 1]
      : null;

  const canEliminate =
    topDiscardCard && topDiscardCard.rank === cardToEliminate.rank;

  if (canEliminate) {
    // SUCCESSFUL ELIMINATION

    // FIX 1: Mark global elimination as used
    newState.eliminationUsedThisRound = true;

    const eliminatedCard =
      newState.players[targetPlayerIndex].hand[targetCardIndex];

    // Set up pending card selection for eliminating player
    newState.pendingEliminationGive = {
      eliminatingPlayerId,
      targetPlayerId,
      targetCardIndex,
      eliminatedCard: eliminatedCard!,
    };

    // FIX 3: Put eliminating player in card selection mode
    newState.players[eliminatingPlayerIndex].isSelectingCardToGive = true;

    // Discard the eliminated card immediately
    newState.discardPile.push(eliminatedCard!);
    newState.players[targetPlayerIndex].hand[targetCardIndex] = null;

    // Mark individual player as having eliminated
    newState.players[eliminatingPlayerIndex].hasEliminatedThisRound = true;

    return {
      success: true,
      newState,
      message: `Successfully eliminated ${
        eliminatedCard!.rank
      }. Choose a card to give.`,
    };
  } else {
    // FAILED ELIMINATION

    // FIX 1: Wrong elimination does NOT block further elimination attempts
    // (don't set eliminationUsedThisRound = true)

    // Mark individual player as having attempted (prevents spam)
    newState.players[eliminatingPlayerIndex].hasEliminatedThisRound = true;

    return {
      success: false,
      newState,
      message: `Invalid elimination - ${cardToEliminate.rank} doesn't match ${topDiscardCard?.rank}`,
    };
  }
};

// Process card selection for giving (FIX 3)
export const processCardGiving = (
  gameState: GameState,
  givingPlayerId: string,
  cardIndex: number
): {
  success: boolean;
  newState: GameState;
  message: string;
} => {
  const newState = { ...gameState };
  const pending = newState.pendingEliminationGive;

  if (!pending || pending.eliminatingPlayerId !== givingPlayerId) {
    return {
      success: false,
      newState,
      message: "No pending card giving for this player",
    };
  }

  const givingPlayerIndex = newState.players.findIndex(
    (p) => p.id === givingPlayerId
  );
  const receivingPlayerIndex = newState.players.findIndex(
    (p) => p.id === pending.targetPlayerId
  );

  if (givingPlayerIndex === -1 || receivingPlayerIndex === -1) {
    return {
      success: false,
      newState,
      message: "Invalid player IDs",
    };
  }

  const cardToGive = newState.players[givingPlayerIndex].hand[cardIndex];

  if (!cardToGive) {
    return {
      success: false,
      newState,
      message: "Cannot give eliminated card",
    };
  }

  // Transfer the chosen card
  newState.players[receivingPlayerIndex].hand[pending.targetCardIndex] =
    cardToGive;
  cardToGive.position = pending.targetCardIndex;

  // Remove from giving player's hand
  newState.players[givingPlayerIndex].hand[cardIndex] = null;

  // Clear selection state
  newState.players[givingPlayerIndex].isSelectingCardToGive = false;
  delete newState.pendingEliminationGive;

  return {
    success: true,
    newState,
    message: `Card ${cardToGive.rank} successfully given`,
  };
};

// Reset elimination tracking when new card is discarded (FIX 1 & 2)
export const resetEliminationTracking = (gameState: GameState): GameState => {
  const newState = { ...gameState };

  // FIX 1: Reset global elimination tracking
  newState.eliminationUsedThisRound = false;

  // Reset individual player elimination tracking
  newState.players.forEach((player) => {
    player.hasEliminatedThisRound = false;
  });

  return newState;
};

// Check if elimination is available for a player
export const canPlayerEliminate = (
  gameState: GameState,
  playerId: string
): boolean => {
  if (!gameState.discardPile.length) return false;

  // FIX 1: Check global elimination status
  if (gameState.eliminationUsedThisRound) return false;

  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) return false;

  // Check individual player status
  return !player.hasEliminatedThisRound;
};

// Check if a specific card can be eliminated
export const canEliminateCard = (
  gameState: GameState,
  card: Card | null
): boolean => {
  if (!card || !gameState.discardPile.length) return false;

  const topDiscardCard =
    gameState.discardPile[gameState.discardPile.length - 1];
  return card.rank === topDiscardCard.rank;
};

// Process a player's turn
export const processTurn = (
  gameState: GameState,
  action: GameAction
): GameState => {
  let newState = { ...gameState };
  newState.lastAction = action;

  // Handle actions
  switch (action.type) {
    case "draw":
      // Handle drawing a card - implemented on server
      break;

    case "swap":
      // Handle card swapping - implemented on server
      break;

    case "discard":
      // Handle discarding and reset elimination tracking
      newState = resetEliminationTracking(newState);

      // FIX 2: Apply card powers but don't force their usage
      if (action.cardId) {
        const discardedCard =
          newState.discardPile[newState.discardPile.length - 1];
        if (
          discardedCard &&
          ["7", "8", "9", "10", "Q", "K"].includes(discardedCard.rank)
        ) {
          const playerIndex = newState.players.findIndex(
            (p) => p.id === action.playerId
          );
          if (playerIndex !== -1) {
            newState.players[playerIndex].activePower = discardedCard.rank;
            // Don't advance turn - let player choose power or next action
            return newState;
          }
        }
      }

      // Move to next player for non-power cards
      newState = moveToNextPlayer(newState);
      break;

    case "eliminate":
      // Handle elimination - processed separately
      break;

    case "select-give":
      // Handle card giving selection - processed separately
      break;

    case "declare":
      // Handle game declaration - implemented on server
      newState.gameStatus = "ended";
      break;

    default:
      break;
  }

  return newState;
};

// Move to next player's turn
export const moveToNextPlayer = (gameState: GameState): GameState => {
  const newState = { ...gameState };

  let nextPlayerIndex =
    (newState.currentPlayerIndex + 1) % newState.players.length;

  // Skip players who have the skippedTurn flag (from Jack power)
  while (newState.players[nextPlayerIndex]?.skippedTurn) {
    newState.players[nextPlayerIndex].skippedTurn = false;
    nextPlayerIndex = (nextPlayerIndex + 1) % newState.players.length;
  }

  newState.currentPlayerIndex = nextPlayerIndex;
  return newState;
};

// Calculate final scores
export const calculateScores = (gameState: GameState): GameState => {
  const newState = { ...gameState };

  newState.players.forEach((player) => {
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

  return newState;
};

// Get winner(s) of the game
export const getWinners = (gameState: GameState): Player[] => {
  if (gameState.gameStatus !== "ended" || !gameState.players.length) return [];

  // Find minimum score
  const minScore = Math.min(...gameState.players.map((p) => p.score));

  // Return all players with that score (could be multiple winners in case of a tie)
  return gameState.players.filter((p) => p.score === minScore);
};

// Validate declaration
export const validateDeclaration = (
  gameState: GameState,
  playerId: string,
  declaredRanks: string[]
): {
  isValid: boolean;
  actualCards: Card[];
  message: string;
} => {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    return {
      isValid: false,
      actualCards: [],
      message: "Player not found",
    };
  }

  // Get actual cards (filter out eliminated cards)
  const actualCards = player.hand.filter((card) => card !== null) as Card[];
  const actualRanks = actualCards.map((card) => card.rank);

  // Validate declaration - should match actual cards only
  const isValid =
    declaredRanks.length === actualCards.length &&
    declaredRanks.every((rank, index) => actualRanks[index] === rank);

  return {
    isValid,
    actualCards,
    message: isValid
      ? "Valid declaration"
      : "Declaration doesn't match actual cards",
  };
};
