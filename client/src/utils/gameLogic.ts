// client/src/utils/gameLogic.ts
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
  hand: Card[];
  score: number;
  knownCards: string[]; // IDs of cards the player has seen
  skippedTurn: boolean;
};

export type GameAction = {
  type: "draw" | "swap" | "discard" | "declare" | "match" | "view";
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
      // Queen: Look at one of your cards
      // This is handled in the UI when a queen is played
      break;

    case "K":
      // King: Look at another player's card
      // This is handled in the UI when a king is played
      break;

    default:
      // No special power
      break;
  }

  return newState;
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
      // Handle drawing a card
      // Implemented on server side
      break;

    case "swap":
      // Handle swapping cards
      // Implemented on server side
      break;

    case "discard":
      // Handle discarding a card
      if (action.cardId) {
        const playerIndex = newState.players.findIndex(
          (p) => p.id === action.playerId
        );
        if (playerIndex !== -1) {
          const player = newState.players[playerIndex];
          const cardIndex = player.hand.findIndex(
            (c) => c.id === action.cardId
          );

          if (cardIndex !== -1) {
            const discardedCard = player.hand[cardIndex];

            // Check if we need to apply card power
            newState = applyCardPower(newState, discardedCard, action.playerId);

            // Open matching window if needed
            if (
              ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"].includes(
                discardedCard.rank
              )
            ) {
              newState.matchingDiscardWindow = true;
              newState.matchingDiscardCard = discardedCard;
              // Set timeout handled by server
            }
          }
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
  }

  // Move to next player if needed
  if (action.type !== "match" && action.type !== "declare") {
    // Find next player who doesn't have skippedTurn flag
    let nextPlayerIndex =
      (newState.currentPlayerIndex + 1) % newState.players.length;
    while (newState.players[nextPlayerIndex].skippedTurn) {
      // Reset the skip flag and continue to the next player
      newState.players[nextPlayerIndex].skippedTurn = false;
      nextPlayerIndex = (nextPlayerIndex + 1) % newState.players.length;
    }
    newState.currentPlayerIndex = nextPlayerIndex;
  }

  return newState;
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
