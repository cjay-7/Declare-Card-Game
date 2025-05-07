// server/src/models/Card.ts

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;
  isRevealed: boolean;
  position?: number;
}

/**
 * Card factory function - creates a new card with specified properties
 */
export function createCard(id: string, suit: Suit, rank: Rank): Card {
  // Assign values based on rank (A=1, 2=2, ..., J=11, Q=12, K=13)
  // With K of hearts/diamonds = 0 (as per game rules)
  let value: number;

  if (rank === "A") {
    value = 1;
  } else if (rank === "J") {
    value = 11;
  } else if (rank === "Q") {
    value = 12;
  } else if (rank === "K") {
    value = suit === "hearts" || suit === "diamonds" ? 0 : 13;
  } else {
    value = parseInt(rank);
  }

  return {
    id,
    suit,
    rank,
    value,
    isRevealed: false,
  };
}

/**
 * Returns the Unicode symbol for a given suit
 */
export function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case "hearts":
      return "♥";
    case "diamonds":
      return "♦";
    case "clubs":
      return "♣";
    case "spades":
      return "♠";
  }
}

/**
 * Returns the color (red/black) for a given suit
 */
export function getSuitColor(suit: Suit): "red" | "black" {
  return suit === "hearts" || suit === "diamonds" ? "red" : "black";
}

/**
 * Checks if two cards match for the purpose of discarding
 */
export function cardsMatch(card1: Card, card2: Card): boolean {
  return card1.rank === card2.rank || card1.suit === card2.suit;
}

/**
 * Returns a string representation of the card (e.g. "A♥")
 */
export function cardToString(card: Card): string {
  return `${card.rank}${getSuitSymbol(card.suit)}`;
}
