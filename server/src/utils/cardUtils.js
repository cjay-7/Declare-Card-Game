// server/src/utils/cardUtils.js

// Define card suits and ranks
const suits = ["hearts", "diamonds", "clubs", "spades"];
const ranks = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

/**
 * Create a deck of cards
 * @returns {Array} The complete deck of cards
 */
export const createDeck = () => {
  const deck = [];
  let id = 0;

  suits.forEach((suit) => {
    ranks.forEach((rank) => {
      // Assign values based on rank (A=1, 2=2, ..., J=11, Q=12, K=13)
      // With K of hearts/diamonds = 0 (as per game rules)
      let value =
        rank === "A"
          ? 1
          : rank === "J"
          ? 11
          : rank === "Q"
          ? 12
          : rank === "K"
          ? suit === "hearts" || suit === "diamonds"
            ? 0
            : 13
          : parseInt(rank);

      deck.push({
        id: `${id++}`,
        suit,
        rank,
        value,
        isRevealed: false,
      });
    });
  });

  return deck;
};

/**
 * Shuffle a deck of cards using Fisher-Yates algorithm
 * @param {Array} deck - The deck to shuffle
 * @returns {Array} The shuffled deck
 */
export const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Deal cards to players
 * @param {Array} deck - The deck to deal from
 * @param {number} playerCount - Number of players
 * @returns {Object} Object containing player hands and remaining deck
 */
export const dealCards = (deck, playerCount) => {
  const playerHands = Array(playerCount)
    .fill(null)
    .map(() => []);
  const gameDeck = [...deck];

  // Each player gets 4 cards
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < playerCount; j++) {
      if (gameDeck.length > 0) {
        const card = gameDeck.pop();
        card.position = i;
        playerHands[j].push(card);
      }
    }
  }

  return { playerHands, remainingDeck: gameDeck };
};

/**
 * Reveal initial 2 cards for each player's hand (cards 3 and 4)
 * @param {Array} hand - A player's hand
 * @returns {Array} Updated hand with revealed cards
 */
export const revealInitialCards = (hand) => {
  const updatedHand = [...hand];
  // Reveal cards 3 and 4 (index 2 and 3)
  if (updatedHand[2]) updatedHand[2].isRevealed = true;
  if (updatedHand[3]) updatedHand[3].isRevealed = true;
  return updatedHand;
};

/**
 * Check if two cards match for discard purposes
 * @param {Object} card1 - First card to compare
 * @param {Object} card2 - Second card to compare
 * @returns {boolean} Whether the cards match
 */
export const cardsMatch = (card1, card2) => {
  return card1.rank === card2.rank || card1.suit === card2.suit;
};

/**
 * Calculate score from cards
 * @param {Array} cards - Array of cards
 * @returns {number} Total score
 */
export const calculateScore = (cards) => {
  return cards.reduce((total, card) => total + card.value, 0);
};

/**
 * Check if a set of cards forms a valid sequence or set
 * @param {Array} cards - Array of cards to check
 * @returns {boolean} Whether the cards form a valid declaration
 */
export const isValidDeclare = (cards) => {
  if (cards.length !== 4) return false;

  // Check if all cards have the same rank (set)
  const allSameRank = cards.every((card) => card.rank === cards[0].rank);
  if (allSameRank) return true;

  // Check if all cards have the same suit and form a sequence
  const allSameSuit = cards.every((card) => card.suit === cards[0].suit);
  if (allSameSuit) {
    // Sort by value and check for consecutive values
    const sortedByValue = [...cards].sort((a, b) => a.value - b.value);
    for (let i = 1; i < sortedByValue.length; i++) {
      if (sortedByValue[i].value !== sortedByValue[i - 1].value + 1) {
        return false;
      }
    }
    return true;
  }

  return false;
};
