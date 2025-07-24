/* eslint-disable @typescript-eslint/no-unused-vars */
// client/src/utils/gameLogic.ts - Updated to support separated power activation
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
  activePower?: string; // Current active power (7,8,9,10,Q,K) - only set after explicit activation
  pendingPowerActivation?: string; // NEW: Power waiting for activation decision
};

export type GameAction = {
  type:
    | "draw"
    | "swap"
    | "discard"
    | "declare"
    | "match"
    | "view"
    | "elimination"
    | "elimination-transfer"
    | "power-activation";
  playerId: string;
  cardId?: string;
  targetPlayerId?: string;
  targetCardIndex?: number;
  timestamp: number;
  message?: string;
  powerType?: string; // NEW: For power activation actions
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
    type: "view",
  };
};

// UPDATED: Handle card power effects (only when explicitly activated)
export const applyCardPower = (
  gameState: GameState,
  card: Card,
  playerId: string,
  isExplicitActivation = false // NEW: Flag to distinguish explicit activation
): GameState => {
  const newState = { ...gameState };

  // UPDATED: Only apply Jack power immediately (since it's just turn skip)
  // All other powers require explicit activation
  switch (card.rank) {
    case "J": {
      // Jack: Skip the next player's turn (immediate effect)
      const nextPlayerIndex =
        (newState.currentPlayerIndex + 1) % newState.players.length;
      newState.players[nextPlayerIndex].skippedTurn = true;
      console.log(`[JACK POWER] Applied immediately - skipping next player`);
      break;
    }

    case "7":
    case "8":
    case "9":
    case "10":
    case "Q":
    case "K": {
      // UPDATED: These powers now require explicit activation
      if (isExplicitActivation) {
        const playerIndex = newState.players.findIndex(
          (p) => p.id === playerId
        );
        if (playerIndex !== -1) {
          newState.players[playerIndex].activePower = card.rank;
          console.log(`[POWER] ${card.rank} activated for explicit use`);
        }
      } else {
        // Set pending activation instead of immediate activation
        const playerIndex = newState.players.findIndex(
          (p) => p.id === playerId
        );
        if (playerIndex !== -1) {
          newState.players[playerIndex].pendingPowerActivation = card.rank;
          console.log(`[POWER] ${card.rank} set as pending activation`);
        }
      }
      break;
    }

    default:
      // No special power
      break;
  }

  return newState;
};

// UPDATED: Process a player's turn with new power activation logic
export const processTurn = (
  gameState: GameState,
  action: GameAction
): GameState => {
  let newState = { ...gameState };
  newState.lastAction = action;

  // Handle actions
  switch (action.type) {
    case "draw":
      // Handle drawing a card
      // Implemented on server side
      break;

    case "swap":
      // Handle swapping cards
      // Implemented on server side
      break;

    case "discard":
      // UPDATED: Handle discarding a card with separated power logic
      if (action.cardId) {
        const playerIndex = newState.players.findIndex(
          (p) => p.id === action.playerId
        );
        if (playerIndex !== -1) {
          const player = newState.players[playerIndex];
          const cardIndex = player.hand.findIndex(
            (c) => c && c.id === action.cardId // Check for null cards
          );

          if (cardIndex !== -1 && player.hand[cardIndex]) {
            const discardedCard = player.hand[cardIndex] as Card;

            // UPDATED: Apply card power with new logic
            newState = applyCardPower(
              newState,
              discardedCard,
              action.playerId,
              false
            );

            // UPDATED: Always open elimination window after discard
            // (regardless of power card status)
            newState.matchingDiscardWindow = true;
            newState.matchingDiscardCard = discardedCard;

            // Reset elimination tracking for all players when new card is discarded
            newState.players.forEach((player) => {
              player.hasEliminatedThisRound = false;
            });
          }
        }
      }
      break;

    case "power-activation": // NEW: Handle explicit power activation
      if (action.powerType && action.playerId) {
        const playerIndex = newState.players.findIndex(
          (p) => p.id === action.playerId
        );
        if (playerIndex !== -1) {
          const player = newState.players[playerIndex];
          // Clear pending and set active
          player.pendingPowerActivation = undefined;
          player.activePower = action.powerType;
          console.log(
            `[POWER] ${action.powerType} explicitly activated for ${player.name}`
          );
        }
      }
      break;

    case "declare":
      // Handle declaration
      newState.declarer = action.playerId;
      newState.gameStatus = "ended";
      break;

    case "match":
      // Handle matching discard
      // Implemented on server side
      break;

    case "elimination":
      // Handle card elimination
      // Implemented on server side
      break;
  }

  // UPDATED: Move to next player logic with power consideration
  if (
    action.type !== "match" &&
    action.type !== "declare" &&
    action.type !== "power-activation"
  ) {
    // Find next player who doesn't have skippedTurn flag
    let nextPlayerIndex =
      (newState.currentPlayerIndex + 1) % newState.players.length;

    let attempts = 0;
    while (
      newState.players[nextPlayerIndex].skippedTurn &&
      attempts < newState.players.length
    ) {
      // Clear the skip flag and move to next player
      newState.players[nextPlayerIndex].skippedTurn = false;
      nextPlayerIndex = (nextPlayerIndex + 1) % newState.players.length;
      attempts++;
    }

    newState.currentPlayerIndex = nextPlayerIndex;
  }

  return newState;
};

// NEW: Check if a player has a pending power activation
export const hasPendingPowerActivation = (player: Player): boolean => {
  return !!player.pendingPowerActivation;
};

// NEW: Get pending power type
export const getPendingPowerType = (player: Player): string | null => {
  return player.pendingPowerActivation || null;
};

// NEW: Clear pending power activation
export const clearPendingPowerActivation = (
  gameState: GameState,
  playerId: string
): GameState => {
  const newState = { ...gameState };
  const playerIndex = newState.players.findIndex((p) => p.id === playerId);
  if (playerIndex !== -1) {
    newState.players[playerIndex].pendingPowerActivation = undefined;
  }
  return newState;
};

// NEW: Activate pending power
export const activatePendingPower = (
  gameState: GameState,
  playerId: string
): GameState => {
  const newState = { ...gameState };
  const playerIndex = newState.players.findIndex((p) => p.id === playerId);
  if (playerIndex !== -1) {
    const player = newState.players[playerIndex];
    if (player.pendingPowerActivation) {
      player.activePower = player.pendingPowerActivation;
      player.pendingPowerActivation = undefined;
      console.log(`[POWER] Activated ${player.activePower} for ${player.name}`);
    }
  }
  return newState;
};

// Check if elimination is currently available
export const canEliminate = (gameState: GameState): boolean => {
  return gameState.discardPile.length > 0;
};

// Check if a specific player can eliminate (hasn't eliminated this round)
export const playerCanEliminate = (
  gameState: GameState,
  playerId: string
): boolean => {
  const player = gameState.players.find((p) => p.id === playerId);
  return player
    ? !player.hasEliminatedThisRound && canEliminate(gameState)
    : false;
};

// Get the top discard card for elimination matching
export const getTopDiscardCard = (gameState: GameState): Card | null => {
  return gameState.discardPile.length > 0
    ? gameState.discardPile[gameState.discardPile.length - 1]
    : null;
};

// Check if a card can be eliminated (matches top discard card rank)
export const canEliminateCard = (gameState: GameState, card: Card): boolean => {
  const topDiscard = getTopDiscardCard(gameState);
  return topDiscard ? topDiscard.rank === card.rank : false;
};

// Check if a card can be played on the discard pile
export const canPlayOnDiscard = (
  topCard: Card | null,
  playedCard: Card
): boolean => {
  if (!topCard) return true; // Can always play on empty discard pile
  return cardsMatch(topCard, playedCard);
};

// Get the current player
export const getCurrentPlayer = (gameState: GameState): Player | null => {
  if (gameState.players.length === 0) return null;
  return gameState.players[gameState.currentPlayerIndex];
};

// Get a player by ID
export const getPlayerById = (
  gameState: GameState,
  playerId: string
): Player | null => {
  return gameState.players.find((player) => player.id === playerId) || null;
};

// Helper function to count non-null cards in a player's hand
export const getActiveCardCount = (player: Player): number => {
  return player.hand.filter((card) => card !== null).length;
};

// Helper function to get all non-null cards from a player's hand
export const getActiveCards = (player: Player): Card[] => {
  return player.hand.filter((card) => card !== null) as Card[];
};

// Helper function to check if a player can still play (has at least one card)
export const canPlayerContinue = (player: Player): boolean => {
  return getActiveCardCount(player) > 0;
};

// Helper function to calculate score considering null cards as 0
export const calculatePlayerScore = (player: Player): number => {
  return player.hand.reduce((sum, card) => sum + (card ? card.value : 0), 0);
};

// NEW: Check if a player has any active power interactions available
export const hasActivePowerInteraction = (player: Player): boolean => {
  return !!(player.activePower || player.pendingPowerActivation);
};

// NEW: Get current power state for a player
export const getPlayerPowerState = (
  player: Player
): {
  type: "none" | "pending" | "active";
  power?: string;
} => {
  if (player.activePower) {
    return { type: "active", power: player.activePower };
  }
  if (player.pendingPowerActivation) {
    return { type: "pending", power: player.pendingPowerActivation };
  }
  return { type: "none" };
};

// NEW: Check if elimination takes priority over other actions for a player
export const eliminationHasPriority = (
  gameState: GameState,
  playerId: string
): boolean => {
  const player = getPlayerById(gameState, playerId);
  const topDiscard = getTopDiscardCard(gameState);

  return !!(
    player &&
    !player.hasEliminatedThisRound &&
    topDiscard &&
    player.hand.some((card) => card && card.rank === topDiscard.rank)
  );
};
