// client/src/utils/cardUtils.ts

export interface Card {
    id: string;
    suit: "hearts" | "diamonds" | "clubs" | "spades";
    rank: "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
    value: number;
    isRevealed: boolean;
    position?: number;
  }
  
  export type CardSelection = {
    cardId: string;
    isSelected: boolean;
  };
  
  // Create a deck of cards
  export const createDeck = (): Card[] => {
    const suits = ["hearts", "diamonds", "clubs", "spades"] as const;
    const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;
    const deck: Card[] = [];
  
    let id = 0;
    suits.forEach((suit) => {
      ranks.forEach((rank) => {
        // Assign values based on rank (A=1, 2=2, ..., J=11, Q=12, K=13)
        // With K of hearts/diamonds = 0 (as per your data model)
        const value = 
          rank === "A" ? 1 :
          rank === "J" ? 11 :
          rank === "Q" ? 12 :
          rank === "K" ? (suit === "hearts" || suit === "diamonds" ? 0 : 13) :
          parseInt(rank);
  
        deck.push({
          id: `${id++}`,
          suit,
          rank,
          value,
          isRevealed: false
        });
      });
    });
  
    return deck;
  };
  
  // Shuffle an array using Fisher-Yates algorithm
  export const shuffleDeck = (deck: Card[]): Card[] => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  
  // Deal cards to players
  export const dealCards = (deck: Card[], playerCount: number): { playerHands: Card[][], remainingDeck: Card[] } => {
    const playerHands: Card[][] = Array(playerCount).fill(null).map(() => []);
    const gameDeck = [...deck];
    
    // Each player gets 4 cards
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < playerCount; j++) {
        if (gameDeck.length > 0) {
          const card = gameDeck.pop()!;
          card.position = i;
          playerHands[j].push(card);
        }
      }
    }
    
    return { playerHands, remainingDeck: gameDeck };
  };
  
  // Check if a set of cards forms a valid sequence or set
  export const isValidDeclare = (cards: Card[]): boolean => {
    if (cards.length !== 4) return false;
    
    // Check if all cards have the same rank (set)
    const allSameRank = cards.every(card => card.rank === cards[0].rank);
    if (allSameRank) return true;
    
    // Check if all cards have the same suit and form a sequence
    const allSameSuit = cards.every(card => card.suit === cards[0].suit);
    if (allSameSuit) {
      // Sort by value and check for consecutive values
      const sortedByValue = [...cards].sort((a, b) => a.value - b.value);
      for (let i = 1; i < sortedByValue.length; i++) {
        if (sortedByValue[i].value !== sortedByValue[i-1].value + 1) {
          return false;
        }
      }
      return true;
    }
    
    return false;
  };
  
  // Calculate score from cards (normally done on the server)
  export const calculateScore = (cards: Card[]): number => {
    return cards.reduce((total, card) => total + card.value, 0);
  };
  
  // Check if two cards match for discard purposes
  export const cardsMatch = (card1: Card, card2: Card): boolean => {
    return card1.rank === card2.rank || card1.suit === card2.suit;
  };
  
  // Reveal initial 2 cards for a player
  export const revealInitialCards = (hand: Card[]): Card[] => {
    const updatedHand = [...hand];
    // Reveal first two cards
    if (updatedHand[0]) updatedHand[0].isRevealed = true;
    if (updatedHand[1]) updatedHand[1].isRevealed = true;
    return updatedHand;
  };