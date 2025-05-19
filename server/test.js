// server/test.js
// Basic test script to verify server functions

import {
  createDeck,
  shuffleDeck,
  dealCards,
  revealInitialCards,
  cardsMatch,
  calculateScore,
  isValidDeclare,
} from "./src/utils/cardUtils.js";

// Test createDeck
console.log("Testing createDeck...");
const deck = createDeck();
console.log(`Created deck with ${deck.length} cards`);
console.log("First card:", deck[0]);
console.log("Last card:", deck[deck.length - 1]);

// Test shuffleDeck
console.log("\nTesting shuffleDeck...");
const shuffled = shuffleDeck(deck);
console.log("First 3 cards before shuffle:", deck.slice(0, 3));
console.log("First 3 cards after shuffle:", shuffled.slice(0, 3));

// Test dealCards
console.log("\nTesting dealCards...");
const { playerHands, remainingDeck } = dealCards(shuffled, 3);
console.log(
  `Dealt cards to 3 players. Remaining deck: ${remainingDeck.length} cards`
);
console.log("Player 1 hand:", playerHands[0]);
console.log("Player 2 hand:", playerHands[1]);
console.log("Player 3 hand:", playerHands[2]);

// Test revealInitialCards
console.log("\nTesting revealInitialCards...");
const revealedHand = revealInitialCards(playerHands[0]);
console.log(
  "Revealed hand status:",
  revealedHand.map((card) => card.isRevealed)
);

// Test cardsMatch
console.log("\nTesting cardsMatch...");
const card1 = { suit: "hearts", rank: "A" };
const card2 = { suit: "hearts", rank: "2" }; // Same suit
const card3 = { suit: "clubs", rank: "A" }; // Same rank
const card4 = { suit: "diamonds", rank: "5" }; // No match
console.log("Same suit match:", cardsMatch(card1, card2));
console.log("Same rank match:", cardsMatch(card1, card3));
console.log("No match:", cardsMatch(card1, card4));

// Test calculateScore
console.log("\nTesting calculateScore...");
const testHand = [{ value: 1 }, { value: 10 }, { value: 5 }, { value: 0 }];
console.log("Score:", calculateScore(testHand));

// Test isValidDeclare
console.log("\nTesting isValidDeclare...");
const sameRankHand = [
  { rank: "5", suit: "hearts", value: 5 },
  { rank: "5", suit: "diamonds", value: 5 },
  { rank: "5", suit: "clubs", value: 5 },
  { rank: "5", suit: "spades", value: 5 },
];
console.log("Same rank valid:", isValidDeclare(sameRankHand));

const sequenceHand = [
  { rank: "2", suit: "hearts", value: 2 },
  { rank: "3", suit: "hearts", value: 3 },
  { rank: "4", suit: "hearts", value: 4 },
  { rank: "5", suit: "hearts", value: 5 },
];
console.log("Sequence valid:", isValidDeclare(sequenceHand));

const invalidHand = [
  { rank: "2", suit: "hearts", value: 2 },
  { rank: "4", suit: "clubs", value: 4 },
  { rank: "7", suit: "diamonds", value: 7 },
  { rank: "K", suit: "spades", value: 13 },
];
console.log("Invalid hand:", isValidDeclare(invalidHand));

console.log("\nAll tests completed!");
