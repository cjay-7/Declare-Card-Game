// server/index.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import {
  createDeck,
  shuffleDeck,
  dealCards,
  revealInitialCards,
} from "./src/utils/cardUtils.js";

// Initialize Express app and HTTP server
const app = express();
const server = createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite's default port
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Game rooms storage - store all active game rooms
const rooms = {};

// Helper function to get current player
const getCurrentPlayer = (room) => {
  if (!room || !room.players || room.players.length === 0) return null;
  return room.players[room.currentPlayerIndex || 0];
};

// Helper function to move to next player
const moveToNextPlayer = (room) => {
  if (!room) return;

  // Find next player who doesn't have skippedTurn flag
  let nextPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
  while (room.players[nextPlayerIndex]?.skippedTurn) {
    // Reset the skip flag and continue to the next player
    room.players[nextPlayerIndex].skippedTurn = false;
    nextPlayerIndex = (nextPlayerIndex + 1) % room.players.length;
  }
  room.currentPlayerIndex = nextPlayerIndex;
};

// Handle socket connections
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle joining a room
  socket.on("join-room", ({ roomId, playerName }) => {
    // Create room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [],
        deck: [],
        discardPile: [],
        gameStatus: "waiting",
        currentPlayerIndex: 0,
        matchingDiscardWindow: false,
        matchingDiscardCard: null,
        roundNumber: 1,
        declarer: null,
        lastAction: null,
      };
    }

    // Check if player is already in the room
    const existingPlayerIndex = rooms[roomId].players.findIndex(
      (p) => p.id === socket.id
    );
    if (existingPlayerIndex !== -1) {
      // Player is rejoining - update their socket connection
      console.log(`${playerName} reconnected to room: ${roomId}`);
      rooms[roomId].players[existingPlayerIndex].connected = true;
    } else {
      // New player joining
      const isHost = rooms[roomId].players.length === 0;

      const player = {
        id: socket.id,
        name: playerName,
        isHost,
        hand: [],
        score: 0,
        knownCards: [],
        skippedTurn: false,
        connected: true,
      };

      rooms[roomId].players.push(player);
      console.log(
        `[${rooms[roomId].players.length}] ${playerName} joined room: ${roomId}`
      );
    }

    // Join the socket room
    socket.join(roomId);

    // Store reference to roomId on socket for disconnect handling
    socket.roomId = roomId;

    // Send updated player list to all clients in the room
    io.to(roomId).emit("update-players", rooms[roomId].players);

    // Send game state update
    io.to(roomId).emit("game-state-update", rooms[roomId]);
  });

  // Handle starting the game
  socket.on("start-game", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player?.isHost) return; // Only host can start the game

    if (room.players.length < 2) {
      socket.emit("error", { message: "Need at least 2 players to start" });
      return;
    }

    // Create and shuffle the deck
    const deck = shuffleDeck(createDeck());

    // Deal cards to players
    const { playerHands, remainingDeck } = dealCards(deck, room.players.length);

    // Assign hands to players and reveal initial cards
    playerHands.forEach((hand, index) => {
      room.players[index].hand = revealInitialCards(hand);
    });

    // Update room state
    room.deck = remainingDeck;
    room.discardPile = [];
    room.gameStatus = "playing";
    room.currentPlayerIndex = 0;

    console.log(
      `Game started in room: ${roomId} with ${room.players.length} players`
    );

    // Notify clients that game has started
    io.to(roomId).emit("start-game");

    // Send updated game state to all players
    io.to(roomId).emit("game-state-update", room);
  });

  // Handle drawing a card
  socket.on("draw-card", ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (!room || room.gameStatus !== "playing") return;

    // Check if it's this player's turn
    const currentPlayer = getCurrentPlayer(room);
    if (!currentPlayer || currentPlayer.id !== playerId) {
      socket.emit("error", { message: "Not your turn" });
      return;
    }

    // Check if there are cards left in the deck
    if (room.deck.length === 0) {
      // If deck is empty, shuffle discard pile except the top card
      if (room.discardPile.length > 1) {
        const topCard = room.discardPile.pop();
        room.deck = shuffleDeck(room.discardPile);
        room.discardPile = [topCard];
      } else {
        socket.emit("error", { message: "No cards left to draw" });
        return;
      }
    }

    // Draw a card from the deck
    const drawnCard = room.deck.pop();

    // Send the drawn card to the player
    socket.emit("card-drawn", drawnCard);

    // Record this action
    room.lastAction = {
      type: "draw",
      playerId: playerId,
      timestamp: Date.now(),
    };

    // Update game state for all players
    io.to(roomId).emit("game-state-update", room);
  });

  // Handle discarding a card
  socket.on("discard-card", ({ roomId, playerId, cardId }) => {
    const room = rooms[roomId];
    if (!room || room.gameStatus !== "playing") return;

    // Check if it's this player's turn
    const currentPlayer = getCurrentPlayer(room);
    if (!currentPlayer || currentPlayer.id !== playerId) {
      socket.emit("error", { message: "Not your turn" });
      return;
    }

    // Find the card in player's hand
    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    const cardIndex = room.players[playerIndex].hand.findIndex(
      (c) => c.id === cardId
    );

    if (cardIndex === -1) {
      socket.emit("error", { message: "Card not found in your hand" });
      return;
    }

    // Remove card from hand and add to discard pile
    const discardedCard = room.players[playerIndex].hand.splice(
      cardIndex,
      1
    )[0];
    room.discardPile.push(discardedCard);

    // Record this action
    room.lastAction = {
      type: "discard",
      playerId: playerId,
      cardId: cardId,
      timestamp: Date.now(),
    };

    // Apply special card powers if needed
    if (discardedCard.rank === "J") {
      // Jack: Skip the next player's turn
      const nextPlayerIndex =
        (room.currentPlayerIndex + 1) % room.players.length;
      room.players[nextPlayerIndex].skippedTurn = true;
    }

    // Move to next player
    moveToNextPlayer(room);

    // Update game state for all players
    io.to(roomId).emit("game-state-update", room);
  });

  // Handle swapping a card
  socket.on("swap-card", ({ roomId, playerId, cardId, targetPlayerId }) => {
    const room = rooms[roomId];
    if (!room || room.gameStatus !== "playing") return;

    // Check if it's this player's turn
    const currentPlayer = getCurrentPlayer(room);
    if (!currentPlayer || currentPlayer.id !== playerId) {
      socket.emit("error", { message: "Not your turn" });
      return;
    }

    // Find the current player and target player
    const currentPlayerIndex = room.players.findIndex((p) => p.id === playerId);
    const targetPlayerIndex = room.players.findIndex(
      (p) => p.id === targetPlayerId
    );

    if (currentPlayerIndex === -1 || targetPlayerIndex === -1) {
      socket.emit("error", { message: "Player not found" });
      return;
    }

    // Find the card in current player's hand
    const cardIndex = room.players[currentPlayerIndex].hand.findIndex(
      (c) => c.id === cardId
    );

    if (cardIndex === -1) {
      socket.emit("error", { message: "Card not found in your hand" });
      return;
    }

    // Choose a random card from target player's hand
    const targetCardIndex = Math.floor(
      Math.random() * room.players[targetPlayerIndex].hand.length
    );

    // Swap the cards
    const tempCard = room.players[currentPlayerIndex].hand[cardIndex];
    room.players[currentPlayerIndex].hand[cardIndex] =
      room.players[targetPlayerIndex].hand[targetCardIndex];
    room.players[targetPlayerIndex].hand[targetCardIndex] = tempCard;

    // Record this action
    room.lastAction = {
      type: "swap",
      playerId: playerId,
      cardId: cardId,
      targetPlayerId: targetPlayerId,
      timestamp: Date.now(),
    };

    // Move to next player
    moveToNextPlayer(room);

    // Update game state for all players
    io.to(roomId).emit("game-state-update", room);
  });

  // Handle declaring (ending the game)
  socket.on("declare", ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (!room || room.gameStatus !== "playing") return;

    // Check if it's this player's turn
    const currentPlayer = getCurrentPlayer(room);
    if (!currentPlayer || currentPlayer.id !== playerId) {
      socket.emit("error", { message: "Not your turn" });
      return;
    }

    // Find the player
    const playerIndex = room.players.findIndex((p) => p.id === playerId);

    if (playerIndex === -1) {
      socket.emit("error", { message: "Player not found" });
      return;
    }

    // Calculate scores (simple implementation - you can expand this)
    const scores = room.players.map((player) => {
      // Reveal all cards
      player.hand.forEach((card) => (card.isRevealed = true));

      // Sum the values of cards
      const score = player.hand.reduce((total, card) => total + card.value, 0);
      player.score = score;
      return { id: player.id, name: player.name, score };
    });

    // Set game to ended
    room.gameStatus = "ended";
    room.declarer = playerId;

    // Record this action
    room.lastAction = {
      type: "declare",
      playerId: playerId,
      timestamp: Date.now(),
    };

    // Notify all players of the game end and scores
    io.to(roomId).emit("game-ended", {
      declarer: playerId,
      scores,
    });

    // Update game state for all players
    io.to(roomId).emit("game-state-update", room);
  });

  // Handle viewing an opponent's card (King power)
  socket.on(
    "view-opponent-card",
    ({ roomId, playerId, targetPlayerId, cardIndex }) => {
      const room = rooms[roomId];
      if (!room || room.gameStatus !== "playing") return;

      // Check if player is in the game
      const playerIndex = room.players.findIndex((p) => p.id === playerId);
      const targetPlayerIndex = room.players.findIndex(
        (p) => p.id === targetPlayerId
      );

      if (playerIndex === -1 || targetPlayerIndex === -1) {
        socket.emit("error", { message: "Player not found" });
        return;
      }

      // Check if card exists
      if (!room.players[targetPlayerIndex].hand[cardIndex]) {
        socket.emit("error", { message: "Card not found" });
        return;
      }

      // Send the card info to the player
      const card = room.players[targetPlayerIndex].hand[cardIndex];

      // Add card to known cards
      if (!room.players[playerIndex].knownCards.includes(card.id)) {
        room.players[playerIndex].knownCards.push(card.id);
      }

      socket.emit("card-revealed", {
        playerId: targetPlayerId,
        cardIndex,
        card,
      });
    }
  );

  // Handle viewing own card (Queen power)
  socket.on("view-own-card", ({ roomId, playerId, cardIndex }) => {
    const room = rooms[roomId];
    if (!room || room.gameStatus !== "playing") return;

    // Check if player is in the game
    const playerIndex = room.players.findIndex((p) => p.id === playerId);

    if (playerIndex === -1) {
      socket.emit("error", { message: "Player not found" });
      return;
    }

    // Check if card exists
    if (!room.players[playerIndex].hand[cardIndex]) {
      socket.emit("error", { message: "Card not found" });
      return;
    }

    // Reveal the card for the player
    const card = room.players[playerIndex].hand[cardIndex];
    card.isRevealed = true;

    // Add card to known cards
    if (!room.players[playerIndex].knownCards.includes(card.id)) {
      room.players[playerIndex].knownCards.push(card.id);
    }

    // Update player's hand
    socket.emit("card-revealed", {
      playerId,
      cardIndex,
      card,
    });

    // Update game state
    io.to(roomId).emit("game-state-update", room);
  });

  // Handle player leaving a room
  socket.on("leave-room", ({ roomId, playerId }) => {
    if (!rooms[roomId]) return;

    const playerIndex = rooms[roomId].players.findIndex(
      (p) => p.id === playerId
    );
    if (playerIndex !== -1) {
      // Mark player as disconnected instead of removing
      rooms[roomId].players[playerIndex].connected = false;

      console.log(
        `Player ${rooms[roomId].players[playerIndex].name} left room: ${roomId}`
      );

      // If game is in progress, we keep the player in the array but mark them as disconnected
      // If game is waiting, we can remove them
      if (rooms[roomId].gameStatus === "waiting") {
        rooms[roomId].players.splice(playerIndex, 1);

        // If no players left, delete the room
        if (rooms[roomId].players.length === 0) {
          delete rooms[roomId];
          console.log(`Room ${roomId} deleted - no players left`);
          return;
        }

        // If host left, assign a new host
        if (playerIndex === 0 && rooms[roomId].players.length > 0) {
          rooms[roomId].players[0].isHost = true;
        }
      }

      // Update players in room
      io.to(roomId).emit("update-players", rooms[roomId].players);
      io.to(roomId).emit("game-state-update", rooms[roomId]);
    }

    // Leave the socket room
    socket.leave(roomId);
  });

  // Handle disconnections
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // Check all rooms for this socket
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      // Find player in room
      const playerIndex = rooms[roomId].players.findIndex(
        (p) => p.id === socket.id
      );
      if (playerIndex !== -1) {
        // Mark player as disconnected
        rooms[roomId].players[playerIndex].connected = false;

        console.log(
          `Player ${rooms[roomId].players[playerIndex].name} disconnected from room: ${roomId}`
        );

        // If game is waiting, remove the player
        if (rooms[roomId].gameStatus === "waiting") {
          rooms[roomId].players.splice(playerIndex, 1);

          // If no players left, delete the room
          if (rooms[roomId].players.length === 0) {
            delete rooms[roomId];
            console.log(`Room ${roomId} deleted - no players left`);
            return;
          }

          // If host left, assign a new host
          if (playerIndex === 0 && rooms[roomId].players.length > 0) {
            rooms[roomId].players[0].isHost = true;
          }
        }

        // If it was current player's turn, move to next player
        if (
          rooms[roomId].currentPlayerIndex === playerIndex &&
          rooms[roomId].gameStatus === "playing"
        ) {
          moveToNextPlayer(rooms[roomId]);
        }

        // Update players in room
        io.to(roomId).emit("update-players", rooms[roomId].players);
        io.to(roomId).emit("game-state-update", rooms[roomId]);
      }
    }
  });
});

// Add a route for the root path
app.get("/", (req, res) => {
  res.send("Game server is running");
});

// Start the server
const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
