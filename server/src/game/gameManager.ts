// // server/game/gameManager.js

// // Card suits and ranks
// const suits = ["hearts", "diamonds", "clubs", "spades"];
// const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// // Game rooms storage
// const gameRooms = {};

// // Create a new deck of cards
// const createDeck = () => {
//   const deck = [];
//   let id = 0;
  
//   suits.forEach(suit => {
//     ranks.forEach(rank => {
//       // Assign values based on rank (A=1, 2=2, ..., J=11, Q=12, K=13)
//       // With K of hearts/diamonds = 0 (as per game rules)
//       let value = 
//         rank === "A" ? 1 :
//         rank === "J" ? 11 :
//         rank === "Q" ? 12 :
//         rank === "K" ? (suit === "hearts" || suit === "diamonds" ? 0 : 13) :
//         parseInt(rank);
        
//       deck.push({