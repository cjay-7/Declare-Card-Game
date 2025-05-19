// server/src/server.ts
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import {
  createGame,
  getCurrentPlayer,
  moveToNextPlayer,
  getWinners,
} from "./models/Game";
import {
  createPlayer,
  hasValidDeclare,
  revealInitialCards,
} from "./models/Player";
import { createDeck, shuffleDeck, dealCards } from "./utils/deckUtils";
import { v4 as uuidv4 } from "uuid";

// Game rooms storage
const gameRooms = new Map();

// Set up server
const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Socket events
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join a room
  socket.on("join-room", ({ roomId, playerName }) => {
    // Create room if it doesn't exist
    if (!gameRooms.has(roomId)) {
      const newGame = createGame(roomId);
      gameRooms.set(roomId, newGame);
    }

    // Get the game
    const game = gameRooms.get(roomId);

    // Check if player already exists (reconnection)
    const existingPlayerIndex = game.players.findIndex(
      (p) => p.name === playerName
    );

    if (existingPlayerIndex >= 0) {
      // Reconnection case
      const player = game.players[existingPlayerIndex];
      player.connected = true;
      player.id = socket.id; // Update with new socket ID
    } else {
      // New player
      const isHost = game.players.length === 0;
      const newPlayer = createPlayer(socket.id, playerName, isHost);
      game.players.push(newPlayer);
    }

    // Join the socket room
    socket.join(roomId);

    // Update all clients
    io.to(roomId).emit("game-state-update", game);

    console.log(`${playerName} joined room ${roomId}`);
  });

  // Leave a room
  socket.on("leave-room", ({ roomId, playerId }) => {
    if (!gameRooms.has(roomId)) return;

    const game = gameRooms.get(roomId);
    const playerIndex = game.players.findIndex((p) => p.id === playerId);

    if (playerIndex >= 0) {
      // Set player as disconnected instead of removing
      game.players[playerIndex].connected = false;

      // If it was their turn, move to the next player
      if (
        game.currentPlayerIndex === playerIndex &&
        game.gameStatus === "playing"
      ) {
        moveToNextPlayer(game);
      }

      // If this was the host and they're the last one to leave, reassign host
      if (game.players[playerIndex].isHost) {
        const connectedPlayers = game.players.filter((p) => p.connected);
        if (connectedPlayers.length > 0) {
          connectedPlayers[0].isHost = true;
        }
      }

      // If no players left, remove the room after a delay
      const connectedCount = game.players.filter((p) => p.connected).length;
      if (connectedCount === 0) {
        setTimeout(() => {
          if (
            gameRooms.has(roomId) &&
            gameRooms.get(roomId).players.filter((p) => p.connected).length ===
              0
          ) {
            gameRooms.delete(roomId);
            console.log(`Room ${roomId} removed due to inactivity`);
          }
        }, 300000); // 5 minutes
      }

      // Update all clients
      io.to(roomId).emit("game-state-update", game);
    }

    socket.leave(roomId);
    console.log(`Player ${playerId} left room ${roomId}`);
  });

  // Start the game
  socket.on("start-game", ({ roomId }) => {
    if (!gameRooms.has(roomId)) return;

    const game = gameRooms.get(roomId);

    // Check if player is the host
    const player = game.players.find((p) => p.id === socket.id);
    if (!player || !player.isHost) return;

    // Check if enough players
    const connectedPlayers = game.players.filter((p) => p.connected);
    if (connectedPlayers.length < 2) return;

    // Initialize the game
    game.gameStatus = "playing";
    game.currentPlayerIndex = 0;
    game.roundNumber = 1;

    // Create and shuffle deck
    const deck = createDeck();
    game.deck = shuffleDeck(deck);

    // Deal cards
    const { playerHands, remainingDeck } = dealCards(
      game.deck,
      connectedPlayers.length
    );

    // Assign hands to players and reveal first two cards
    connectedPlayers.forEach((player, index) => {
      player.hand = playerHands[index];
      player.score = 0;
      player.knownCards = [];
      player.skippedTurn = false;

      // Reveal first two cards
      revealInitialCards(player);
    });

    game.deck = remainingDeck;
    game.discardPile = [];

    // Update all clients
    io.to(roomId).emit("game-state-update", game);

    console.log(`Game started in room ${roomId}`);
  });

  // Draw a card
  socket.on("draw-card", ({ roomId, playerId }) => {
    if (!gameRooms.has(roomId)) return;

    const game = gameRooms.get(roomId);

    // Check if it's the player's turn
    const currentPlayer = getCurrentPlayer(game);
    if (!currentPlayer || currentPlayer.id !== playerId) return;

    // Check if deck has cards
    if (game.deck.length === 0) {
      // Handle empty deck (shuffle discard pile minus top card)
      if (game.discardPile.length > 1) {
        const topCard = game.discardPile.pop();
        game.deck = shuffleDeck(game.discardPile);
        game.discardPile = topCard ? [topCard] : [];
      } else {
        // No cards left to draw
        return;
      }
    }

    // Draw a card
    const drawnCard = game.deck.pop();

    // Send the drawn card to the player
    socket.emit("card-drawn", drawnCard);

    // Update game state for all players
    io.to(roomId).emit("game-state-update", game);

    console.log(`Player ${playerId} drew a card`);
  });

  // Swap a card
  socket.on("swap-card", ({ roomId, playerId, cardId, targetPlayerId }) => {
    if (!gameRooms.has(roomId)) return;

    const game = gameRooms.get(roomId);

    // Check if it's the player's turn
    const currentPlayer = getCurrentPlayer(game);
    if (!currentPlayer || currentPlayer.id !== playerId) return;

    // Find the player and target player
    const player = game.players.find((p) => p.id === playerId);
    const targetPlayer = game.players.find((p) => p.id === targetPlayerId);

    if (!player || !targetPlayer) return;

    // Find the card in player's hand
    const cardIndex = player.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return;

    // For simplicity, we'll swap with a random card from target player's hand
    // In a real implementation, you'd want UI to select the specific card
    const targetCardIndex = Math.floor(
      Math.random() * targetPlayer.hand.length
    );

    // Swap the cards
    const playerCard = player.hand[cardIndex];
    const targetCard = targetPlayer.hand[targetCardIndex];

    player.hand[cardIndex] = targetCard;
    targetPlayer.hand[targetCardIndex] = playerCard;

    // Add this to last action
    game.lastAction = {
      type: "swap",
      playerId,
      cardId,
      targetPlayerId,
      timestamp: Date.now(),
    };

    // Move to next player
    moveToNextPlayer(game);

    // Update all clients
    io.to(roomId).emit("game-state-update", game);

    console.log(
      `Player ${playerId} swapped a card with player ${targetPlayerId}`
    );
  });

  // Discard a card
  socket.on("discard-card", ({ roomId, playerId, cardId }) => {
    if (!gameRooms.has(roomId)) return;

    const game = gameRooms.get(roomId);

    // Check if it's the player's turn
    const currentPlayer = getCurrentPlayer(game);
    if (!currentPlayer || currentPlayer.id !== playerId) return;

    // Find the player
    const player = game.players.find((p) => p.id === playerId);
    if (!player) return;

    // Find the card in player's hand
    const cardIndex = player.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return;

    // Remove card from hand and add to discard pile
    const discardedCard = player.hand.splice(cardIndex, 1)[0];
    game.discardPile.push(discardedCard);

    // Handle special card powers
    if (discardedCard.rank === "J") {
      // Jack: Skip the next player's turn
      const nextPlayerIndex =
        (game.currentPlayerIndex + 1) % game.players.length;
      game.players[nextPlayerIndex].skippedTurn = true;
    }

    // Add this to last action
    game.lastAction = {
      type: "discard",
      playerId,
      cardId,
      timestamp: Date.now(),
    };

    // Move to next player
    moveToNextPlayer(game);

    // Update all clients
    io.to(roomId).emit("game-state-update", game);

    console.log(`Player ${playerId} discarded a card`);
  });

  // Declare
  socket.on("declare", ({ roomId, playerId }) => {
    if (!gameRooms.has(roomId)) return;

    const game = gameRooms.get(roomId);

    // Check if it's the player's turn
    const currentPlayer = getCurrentPlayer(game);
    if (!currentPlayer || currentPlayer.id !== playerId) return;

    // Find the player
    const player = game.players.find((p) => p.id === playerId);
    if (!player) return;

    // Check if the declare is valid
    const isValid = hasValidDeclare(player);

    if (isValid) {
      // Mark game as ended
      game.gameStatus = "ended";
      game.declarer = playerId;

      // Calculate final scores
      game.players.forEach((p) => {
        // Sum the values of all cards in hand
        p.score = p.hand.reduce((total, card) => total + card.value, 0);
      });

      // Add this to last action
      game.lastAction = {
        type: "declare",
        playerId,
        timestamp: Date.now(),
      };

      // Get winners
      const winners = getWinners(game);

      // Notify all players of game end
      io.to(roomId).emit("game-ended", {
        declarer: playerId,
        isValid,
        winners: winners.map((w) => ({
          id: w.id,
          name: w.name,
          score: w.score,
        })),
      });
    } else {
      // Invalid declare - penalize player by revealing all their cards
      player.hand.forEach((card) => {
        card.isRevealed = true;
      });

      // Add this to last action
      game.lastAction = {
        type: "declare",
        playerId,
        timestamp: Date.now(),
      };

      // Move to next player
      moveToNextPlayer(game);
    }

    // Update all clients
    io.to(roomId).emit("game-state-update", game);

    console.log(
      `Player ${playerId} declared with ${isValid ? "valid" : "invalid"} hand`
    );
  });

  // View opponent's card (King power)
  socket.on(
    "view-opponent-card",
    ({ roomId, playerId, targetPlayerId, cardIndex }) => {
      if (!gameRooms.has(roomId)) return;

      const game = gameRooms.get(roomId);

      // Check if it's the player's turn
      const currentPlayer = getCurrentPlayer(game);
      if (!currentPlayer || currentPlayer.id !== playerId) return;

      // Find the player and target player
      const player = game.players.find((p) => p.id === playerId);
      const targetPlayer = game.players.find((p) => p.id === targetPlayerId);

      if (!player || !targetPlayer) return;

      // Check if the cardIndex is valid
      if (cardIndex < 0 || cardIndex >= targetPlayer.hand.length) return;

      // Reveal the card to the current player
      const cardId = targetPlayer.hand[cardIndex].id;
      if (!player.knownCards.includes(cardId)) {
        player.knownCards.push(cardId);
      }

      // Send the card info to the player
      socket.emit("card-revealed", {
        playerId: targetPlayerId,
        cardIndex,
        card: targetPlayer.hand[cardIndex],
      });

      // Add this to last action
      game.lastAction = {
        type: "view",
        playerId,
        targetPlayerId,
        targetCardIndex: cardIndex,
        timestamp: Date.now(),
      };

      console.log(`Player ${playerId} viewed card of player ${targetPlayerId}`);
    }
  );

  // View own card (Queen power)
  socket.on("view-own-card", ({ roomId, playerId, cardIndex }) => {});
});
