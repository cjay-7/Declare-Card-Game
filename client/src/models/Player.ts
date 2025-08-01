// server/src/models/Player.ts
import { type Card } from "./Card";

export interface Player {
  id: string; // Socket ID
  name: string; // Display name
  isHost: boolean; // Whether this player is the host
  hand: Card[]; // The player's current hand
  score: number; // Player's current score
  knownCards: string[]; // IDs of cards the player has seen
  skippedTurn: boolean; // Whether this player's next turn should be skipped
  connected: boolean; // Whether the player is currently connected
}

/**
 * Creates a new player
 */
export function createPlayer(
  id: string,
  name: string,
  isHost: boolean = false
): Player {
  return {
    id,
    name,
    isHost,
    hand: [],
    score: 0,
    knownCards: [],
    skippedTurn: false,
    connected: true,
  };
}

/**
 * Calculates a player's current score based on their hand
 */
export function calculatePlayerScore(player: Player): number {
  return player.hand.reduce((total, card) => total + card.value, 0);
}

/**
 * Checks if a player has a valid declare (set or sequence)
 */
export function hasValidDeclare(player: Player): boolean {
  const { hand } = player;

  // Filter out eliminated cards (null values) to get actual cards
  const actualCards = hand.filter((card): card is Card => card !== null);

  // Need exactly 4 non-eliminated cards to declare
  if (actualCards.length !== 4) return false;

  // Check for a set (all same rank)
  const isSet = actualCards.every((card) => card.rank === actualCards[0].rank);
  if (isSet) return true;

  // Check for a sequence (same suit, consecutive values)
  const isSameSuit = actualCards.every((card) => card.suit === actualCards[0].suit);
  if (isSameSuit) {
    // Sort by value
    const sortedHand = [...actualCards].sort((a, b) => a.value - b.value);

    // Check if values are consecutive
    for (let i = 1; i < sortedHand.length; i++) {
      if (sortedHand[i].value !== sortedHand[i - 1].value + 1) {
        return false;
      }
    }
    return true;
  }

  return false;
}

/**
 * Checks if a player knows all their cards (all revealed)
 */
export function playerKnowsAllCards(player: Player): boolean {
  return player.hand.every((card) => card.isRevealed);
}

/**
 * Reveals initial cards for a player (cards 3 and 4)
 */
export function revealInitialCards(player: Player): void {
  if (player.hand.length >= 3) player.hand[2].isRevealed = true;
  if (player.hand.length >= 4) player.hand[3].isRevealed = true;
}
