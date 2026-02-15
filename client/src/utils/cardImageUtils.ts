// client/src/utils/cardImageUtils.ts
// Utility functions for mapping cards to cardsJS SVG image paths

import type { CardSuit, CardRank } from "../components/Card";

/**
 * Maps card suit from game format to cardsJS format
 * cardsJS uses: H (hearts), D (diamonds), C (clubs), S (spades)
 */
export const suitToCardsJS = (suit: CardSuit): string => {
  const mapping: Record<CardSuit, string> = {
    hearts: "H",
    diamonds: "D",
    clubs: "C",
    spades: "S",
  };
  return mapping[suit];
};

/**
 * Maps card rank from game format to cardsJS format
 * cardsJS uses: A, 2-10 (or T for 10), J, Q, K
 */
export const rankToCardsJS = (rank: CardRank): string => {
  // cardsJS accepts both "10" and "T" for ten
  return rank === "10" ? "T" : rank;
};

/**
 * Gets the SVG image path for a card
 * @param suit - The card suit (optional if card is face-down)
 * @param rank - The card rank (optional if card is face-down)
 * @param isRevealed - Whether the card is face-up
 * @returns The path to the card SVG image
 */
export const getCardImagePath = (
  suit?: CardSuit,
  rank?: CardRank,
  isRevealed: boolean = false
): string => {
  if (!isRevealed || !suit || !rank) {
    // Return blue back for face-down cards
    return "/cards/BLUE_BACK.svg";
  }

  const cardsJSSuit = suitToCardsJS(suit);
  const cardsJSRank = rankToCardsJS(rank);
  return `/cards/${cardsJSRank}${cardsJSSuit}.svg`;
};

/**
 * Gets the card image path from a Card object
 */
export const getCardImagePathFromCard = (card: {
  suit?: CardSuit;
  rank?: CardRank;
  isRevealed?: boolean;
}): string => {
  return getCardImagePath(
    card.suit,
    card.rank,
    card.isRevealed ?? false
  );
};
