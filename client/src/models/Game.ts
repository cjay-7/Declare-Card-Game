// server/src/models/Game.ts
// server/src/models/Game.ts
import type { Card } from "./Card";
import type { Player } from "./Player";

export type GameStatus = "waiting" | "playing" | "ended";

export type GameAction = {
  type: "draw" | "swap" | "discard" | "declare" | "match" | "view" | "elimination";
  playerId: string;
  cardId?: string;
  targetPlayerId?: string;
  targetCardIndex?: number;
  timestamp: number;
};

export interface Game {
  id: string;
  players: Player[];
  deck: Card[];
  discardPile: Card[];
  gameStatus: GameStatus;
  currentPlayerIndex: number;
  matchingDiscardWindow: boolean;
  matchingDiscardCard: Card | null;
  matchingDiscardTimeout: "NodeJS.Timeout" | null;
  roundNumber: number;
  declarer: string | null;
  lastAction: GameAction | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Creates a new game instance
 */
export function createGame(id: string): Game {
  return {
    id,
    players: [],
    deck: [],
    discardPile: [],
    gameStatus: "waiting",
    currentPlayerIndex: 0,
    matchingDiscardWindow: false,
    matchingDiscardCard: null,
    matchingDiscardTimeout: null,
    roundNumber: 1,
    declarer: null,
    lastAction: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Gets the current player whose turn it is
 */
export function getCurrentPlayer(game: Game): Player | null {
  if (!game.players.length) return null;
  return game.players[game.currentPlayerIndex];
}

/**
 * Moves to the next player's turn
 */
export function moveToNextPlayer(game: Game): void {
  if (!game.players.length) return;

  // Find next player who doesn't have skippedTurn flag
  let nextPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
  while (game.players[nextPlayerIndex]?.skippedTurn) {
    // Reset the skip flag and continue to the next player
    game.players[nextPlayerIndex].skippedTurn = false;
    nextPlayerIndex = (nextPlayerIndex + 1) % game.players.length;
  }
  game.currentPlayerIndex = nextPlayerIndex;
}

/**
 * Checks if the game can be started
 */
export function canStartGame(game: Game): boolean {
  // Need at least 2 connected players
  const connectedPlayers = game.players.filter((p) => p.connected);
  return connectedPlayers.length >= 2;
}

/**
 * Gets the winner(s) of the game by lowest score
 */
export function getWinners(game: Game): Player[] {
  if (game.gameStatus !== "ended" || !game.players.length) return [];

  // Find minimum score
  const minScore = Math.min(...game.players.map((p) => p.score));

  // Return all players with that score (could be multiple winners in case of a tie)
  return game.players.filter((p) => p.score === minScore);
}

/**
 * Calculates the total remaining cards in the game (deck + hands + discard)
 */
export function getTotalRemainingCards(game: Game): number {
  const deckCards = game.deck.length;
  const discardCards = game.discardPile.length;
  const handCards = game.players.reduce(
    (sum, player) => sum + player.hand.length,
    0
  );

  return deckCards + discardCards + handCards;
}
