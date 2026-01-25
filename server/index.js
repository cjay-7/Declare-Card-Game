// server/index.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import os from "os";
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
// Allow connections from localhost and network IPs
const io = new Server(server, {
  cors: {
    origin: true, // Allow all origins (for network access from phones)
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Game rooms storage - store all active game rooms
const rooms = {};
// Track elimination locks to prevent multiple simultaneous eliminations
const eliminationLocks = {};
// Fix #2: Track power card timeouts to prevent stuck turns
const powerCardTimeouts = {}; // roomId -> { playerId -> timeoutId }

// Helper function to ensure game state includes all required fields when emitting
const prepareGameStateForEmit = (room) => {
  if (!room) return room;
  
  // Ensure eliminationUsedThisRound is always a boolean (default to false if undefined/null)
  // Socket.io might not serialize undefined properties, so we MUST ensure it's always a boolean
  const eliminationUsed = room.eliminationUsedThisRound === true;
  
  // Explicitly include eliminationUsedThisRound - don't rely on spread operator
  // because if the property doesn't exist on room, it won't be in the spread result
  const state = {
    ...room,
    eliminationUsedThisRound: eliminationUsed, // ALWAYS include as boolean, never undefined
  };
  
  // Double-check: ensure the field is actually in the object
  if (!('eliminationUsedThisRound' in state)) {
    console.error(`❌ CRITICAL: eliminationUsedThisRound missing from prepared state!`);
    state.eliminationUsedThisRound = false; // Force add it
  }
  
  return state;
};

// Helper function to get current player
// Fix #1: Add bounds checking to prevent invalid index access
const getCurrentPlayer = (room) => {
  if (!room || !room.players || room.players.length === 0) return null;
  const index = room.currentPlayerIndex || 0;
  if (index < 0 || index >= room.players.length) {
    console.error(`❌ Invalid currentPlayerIndex: ${index} (players.length: ${room.players.length}), resetting to 0`);
    room.currentPlayerIndex = 0;
    return room.players[0] || null;
  }
  return room.players[index];
};

// Helper function to move to next player
// Turn system: Simple rotation - Player 1 → Player 2 → ... → Player N → Player 1
// Only Jack card (when discarded directly after picking) can skip a turn
// Eliminations do NOT affect turn progression
// Fix #3: Clear power state when turn changes
// Fix #4: Add debug logging
const moveToNextPlayer = (room) => {
  if (!room) return;

  // Fix #4: Debug logging - track turn change
  const oldIndex = room.currentPlayerIndex;
  const oldPlayer = room.players[oldIndex]?.name || "Unknown";

  // Fix #3: Clear active powers for the current player before moving
  const currentPlayer = getCurrentPlayer(room);
  if (currentPlayer && (currentPlayer.activePower || currentPlayer.usingPower)) {
    console.log(`🧹 Clearing power state for ${currentPlayer.name}: activePower=${currentPlayer.activePower}, usingPower=${currentPlayer.usingPower}`);
    const powerRank = currentPlayer.activePower;
    currentPlayer.activePower = null;
    currentPlayer.usingPower = false;
    
    // Fix #2: Also clear any timeout for this player (search all rooms)
    // Note: Timeout will also check if power is still active, so this is a safety measure
    for (const [roomId, roomData] of Object.entries(rooms)) {
      if (roomData === room && powerCardTimeouts[roomId] && powerCardTimeouts[roomId][currentPlayer.id]) {
        clearTimeout(powerCardTimeouts[roomId][currentPlayer.id]);
        delete powerCardTimeouts[roomId][currentPlayer.id];
        console.log(`🧹 Cleared power timeout for ${currentPlayer.name} (power: ${powerRank})`);
        break;
      }
    }
  }

  // Simple rotation: move to next player
  let nextPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
  let attempts = 0;
  const maxAttempts = room.players.length * 2; // Prevent infinite loop
  
  while (attempts < maxAttempts) {
    const nextPlayer = room.players[nextPlayerIndex];
    
    // Only skip players with skippedTurn flag (set by Jack card)
    if (nextPlayer?.skippedTurn) {
      console.log(`⏭️ Skipping ${nextPlayer.name}'s turn (Jack card effect)`);
      nextPlayer.skippedTurn = false;
      nextPlayerIndex = (nextPlayerIndex + 1) % room.players.length;
      attempts++;
      continue;
    }
    
    // Found a valid player - eliminations do NOT affect turn progression
    break;
  }
  
  room.currentPlayerIndex = nextPlayerIndex;
  const newPlayer = room.players[nextPlayerIndex]?.name || "Unknown";
  
  // Fix #4: Debug logging - log turn change
  console.log(`🔄 Turn: ${oldPlayer} (index ${oldIndex}) → ${newPlayer} (index ${nextPlayerIndex})`);
};

// Handle socket connections
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle joining a room
  socket.on("join-room", ({ roomId, playerName }) => {
    console.log(`📥 Received join-room: roomId=${roomId}, playerName=${playerName}, socketId=${socket.id}`);
    
    if (!roomId || !playerName) {
      console.error("❌ Invalid join-room request: missing roomId or playerName");
      socket.emit("error", { message: "Missing roomId or playerName" });
      return;
    }

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
        firstCardDrawn: false, // Track if ANY player has drawn their first card
        eliminationUsedThisRound: false, // Track if ANY player has eliminated this round
      };
      eliminationLocks[roomId] = false; // Initialize elimination lock
      console.log(`🆕 Created new room: ${roomId}`);
    }

    // Check if this socket ID is already in the room (reconnection check)
    const existingPlayerIndex = rooms[roomId].players.findIndex(
      (p) => p.id === socket.id
    );
    if (existingPlayerIndex !== -1) {
      // Same socket ID - player is rejoining from same device
      console.log(`🔄 ${playerName} reconnected to room: ${roomId} (socketId: ${socket.id})`);
      rooms[roomId].players[existingPlayerIndex].connected = true;
      rooms[roomId].players[existingPlayerIndex].name = playerName; // Update name in case it changed
    } else {
      // New player joining (different socket ID = different device)
      // Allow multiple players even with same name (different devices)
      const isHost = rooms[roomId].players.length === 0;

      const player = {
        id: socket.id,
        name: playerName,
        isHost,
        hand: [],
        score: 0, // Legacy field, kept for compatibility
        cumulativeScore: 0, // Cumulative score across all rounds
        roundScore: 0, // Score for current round only
        knownCards: [],
        skippedTurn: false,
        hasEliminatedThisRound: false,
        connected: true,
      };

      rooms[roomId].players.push(player);
      console.log(
        `✅ [${rooms[roomId].players.length}] ${playerName} joined room: ${roomId} (socketId: ${socket.id}, isHost: ${isHost})`
      );
    }

    // Join the socket room
    socket.join(roomId);

    // Store reference to roomId on socket for disconnect handling
    socket.roomId = roomId;

    // Send updated player list to all clients in the room
    const playersList = rooms[roomId].players;
    console.log(`📤 Emitting update-players to room ${roomId} with ${playersList.length} players:`, playersList.map(p => ({ id: p.id, name: p.name })));
    io.to(roomId).emit("update-players", playersList);

    // Send game state update
    const gameState = prepareGameStateForEmit(rooms[roomId]);
    console.log(`📤 Emitting game-state-update to room ${roomId} with ${gameState.players?.length || 0} players`);
    io.to(roomId).emit("game-state-update", gameState);
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
    room.firstCardDrawn = false; // Reset on game start
    room.eliminationUsedThisRound = false; // Reset elimination flag on game start

    console.log(
      `Game started in room: ${roomId} with ${room.players.length} players`
    );

    // Notify clients that game has started
    io.to(roomId).emit("start-game");

    // Send updated game state to all players
    io.to(roomId).emit("game-state-update", prepareGameStateForEmit(room));
  });

  // Handle returning to lobby
  socket.on("return-to-lobby", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    // Reset game state to waiting/lobby
    room.gameStatus = "waiting";
    room.deck = [];
    room.discardPile = [];
    room.currentPlayerIndex = 0;
    room.firstCardDrawn = false;
    room.eliminationUsedThisRound = false; // Reset elimination flag

    // Reset all players' hands (but preserve cumulative scores)
    room.players.forEach((player) => {
      player.hand = [];
      player.score = 0; // Legacy field
      player.roundScore = 0; // Reset round score
      // Keep cumulativeScore - don't reset it
      player.activePower = null;
      player.isReady = false;
    });

    console.log(`Game reset to lobby in room: ${roomId}`);

    // Send updated game state to all players
    io.to(roomId).emit("game-state-update", prepareGameStateForEmit(room));
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

    // Eliminations do NOT prevent drawing - they are independent of turns

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

    // Store the drawn card in the room (for potential discard)
    room.drawnCard = drawnCard;
    room.drawnCardPlayer = playerId;

    // Close elimination window when player draws (next player has started their chance)
    // This prevents eliminations after the next player has picked a card
    // According to rules: elimination window closes when next player picks a card
    if (room.eliminationUsedThisRound) {
      console.log(`🔒 Closing elimination window - ${currentPlayer.name} has drawn a card`);
      room.eliminationUsedThisRound = false;
      eliminationLocks[roomId] = false;
      // Reset elimination flags for all players
      room.players.forEach((player) => {
        player.hasEliminatedThisRound = false;
      });
    }

    // Mark that first card has been drawn (affects card visibility for all players)
    if (!room.firstCardDrawn) {
      room.firstCardDrawn = true;
      console.log(`🎯 First card drawn in room ${roomId} - all initial cards will now be hidden`);
    }

    console.log(`✅ Stored drawn card for potential discard: ${drawnCard.rank}${drawnCard.suit} (ID: ${drawnCard.id}) for player ${playerId}`);

    // Send the drawn card to the player
    socket.emit("card-drawn", drawnCard);

    // Record this action
    room.lastAction = {
      type: "draw",
      playerId: playerId,
      timestamp: Date.now(),
    };

    // Update game state for all players
    io.to(roomId).emit("game-state-update", prepareGameStateForEmit(room));
  });

  // Handle replacing a hand card with drawn card
  socket.on("replace-with-drawn", ({ roomId, playerId, drawnCardId, handCardId }) => {
    console.log(`📥 RECEIVED replace-with-drawn event - roomId: ${roomId}, playerId: ${playerId}, drawnCardId: ${drawnCardId}, handCardId: ${handCardId}`);

    const room = rooms[roomId];
    if (!room) {
      console.log(`❌ Room ${roomId} not found`);
      return;
    }
    if (room.gameStatus !== "playing") {
      console.log(`❌ Game status is ${room.gameStatus}, not playing`);
      return;
    }

    // Check if it's this player's turn
    const currentPlayer = getCurrentPlayer(room);
    if (!currentPlayer) {
      console.log(`❌ No current player found`);
      socket.emit("error", { message: "Not your turn" });
      return;
    }
    if (currentPlayer.id !== playerId) {
      console.log(`❌ Not player's turn. Current: ${currentPlayer.id}, Requesting: ${playerId}`);
      socket.emit("error", { message: "Not your turn" });
      return;
    }

    // Verify the player has a drawn card and it matches the drawnCardId
    console.log(`🔍 Checking drawn card - room.drawnCard: ${room.drawnCard?.id}, room.drawnCardPlayer: ${room.drawnCardPlayer}`);
    if (!room.drawnCard) {
      console.log(`❌ No drawn card stored in room`);
      socket.emit("error", { message: "No matching drawn card found" });
      return;
    }
    if (room.drawnCardPlayer !== playerId) {
      console.log(`❌ Drawn card player mismatch. Expected: ${room.drawnCardPlayer}, Got: ${playerId}`);
      socket.emit("error", { message: "No matching drawn card found" });
      return;
    }
    if (room.drawnCard.id !== drawnCardId) {
      console.log(`❌ Card ID mismatch. Expected: ${room.drawnCard.id}, Got: ${drawnCardId}`);
      socket.emit("error", { message: "No matching drawn card found" });
      return;
    }

    // Find the player
    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) {
      console.log(`❌ Player not found`);
      socket.emit("error", { message: "Player not found" });
      return;
    }

    // Find the hand card to replace
    const handCardIndex = room.players[playerIndex].hand.findIndex(
      (c) => c && c.id === handCardId
    );
    if (handCardIndex === -1) {
      console.log(`❌ Hand card not found`);
      socket.emit("error", { message: "Card not found in your hand" });
      return;
    }

    // Get the cards
    const drawnCard = room.drawnCard;
    const handCard = room.players[playerIndex].hand[handCardIndex];

    console.log(`✅ Replacing hand card ${handCard.rank}${handCard.suit} (ID: ${handCard.id}) with drawn card ${drawnCard.rank}${drawnCard.suit} (ID: ${drawnCard.id})`);

    // Replace the hand card with the drawn card
    room.players[playerIndex].hand[handCardIndex] = { ...drawnCard, isRevealed: false };

    // Add the old hand card to discard pile
    room.discardPile.push(handCard);

    // Clear the drawn card state
    room.drawnCard = null;
    room.drawnCardPlayer = null;

    // Record this action
    room.lastAction = {
      type: "replace-with-drawn",
      playerId: playerId,
      drawnCardId: drawnCardId,
      handCardId: handCardId,
      timestamp: Date.now(),
    };

    // Opening elimination window: A card was discarded, so eliminations are now possible
    // Window will close when the next player draws a card
    room.eliminationUsedThisRound = false; // Reset to allow eliminations for this new discard
    eliminationLocks[roomId] = false; // Reset lock for new elimination opportunity
    // Note: Don't reset hasEliminatedThisRound here - it's only reset when next player draws

    // IMPORTANT: Cards that were in hand lose their powers when discarded
    // Only cards directly discarded from deck (via discard-drawn-card) have powers
    // So we do NOT activate powers for handCard here - just move to next player
    console.log(`ℹ️ Hand card ${handCard.rank}${handCard.suit} discarded - NO POWERS (cards lose powers once in hand)`);
    console.log(`   Hand card rank: ${handCard.rank}, is power card: ${["7", "8", "9", "10", "J", "Q", "K"].includes(handCard.rank)}`);
    console.log(`   NOT activating power - hand cards lose powers when discarded`);
    
    // Ensure no power is set for this player
    if (room.players[playerIndex].activePower) {
      console.log(`   ⚠️ WARNING: Player had activePower=${room.players[playerIndex].activePower}, clearing it`);
      room.players[playerIndex].activePower = null;
      room.players[playerIndex].usingPower = false;
    }
    
    // Move to next player normally (no powers for hand cards)
    moveToNextPlayer(room);

    console.log(`✅ Replace complete. Discard pile now has ${room.discardPile.length} cards. Top card: ${room.discardPile[room.discardPile.length - 1]?.rank}${room.discardPile[room.discardPile.length - 1]?.suit}`);

    // Update game state for all players
    io.to(roomId).emit("game-state-update", prepareGameStateForEmit(room));
    console.log(`📤 Emitted game-state-update to room ${roomId}`);
  });

  // Handle discarding a drawn card (not yet in hand)
  socket.on("discard-drawn-card", ({ roomId, playerId, cardId }) => {
    console.log(`📥 RECEIVED discard-drawn-card event - roomId: ${roomId}, playerId: ${playerId}, cardId: ${cardId}`);

    const room = rooms[roomId];
    if (!room) {
      console.log(`❌ Room ${roomId} not found`);
      return;
    }
    if (room.gameStatus !== "playing") {
      console.log(`❌ Game status is ${room.gameStatus}, not playing`);
      return;
    }

    // Check if it's this player's turn
    const currentPlayer = getCurrentPlayer(room);
    if (!currentPlayer) {
      console.log(`❌ No current player found`);
      socket.emit("error", { message: "Not your turn" });
      return;
    }
    if (currentPlayer.id !== playerId) {
      console.log(`❌ Not player's turn. Current: ${currentPlayer.id}, Requesting: ${playerId}`);
      socket.emit("error", { message: "Not your turn" });
      return;
    }

    // Verify the player has a drawn card and it matches the cardId
    console.log(`🔍 Checking drawn card - room.drawnCard: ${room.drawnCard?.id}, room.drawnCardPlayer: ${room.drawnCardPlayer}`);
    if (!room.drawnCard) {
      console.log(`❌ No drawn card stored in room`);
      socket.emit("error", { message: "No matching drawn card found" });
      return;
    }
    if (room.drawnCardPlayer !== playerId) {
      console.log(`❌ Drawn card player mismatch. Expected: ${room.drawnCardPlayer}, Got: ${playerId}`);
      socket.emit("error", { message: "No matching drawn card found" });
      return;
    }
    if (room.drawnCard.id !== cardId) {
      console.log(`❌ Card ID mismatch. Expected: ${room.drawnCard.id}, Got: ${cardId}`);
      socket.emit("error", { message: "No matching drawn card found" });
      return;
    }

    // Get the drawn card
    const discardedCard = room.drawnCard;
    console.log(`✅ Discarding drawn card: ${discardedCard.rank}${discardedCard.suit} (ID: ${discardedCard.id})`);

    // Clear the drawn card state
    room.drawnCard = null;
    room.drawnCardPlayer = null;

    // Add card to discard pile
    room.discardPile.push(discardedCard);

    // Record this action
    room.lastAction = {
      type: "discard-drawn",
      playerId: playerId,
      cardId: cardId,
      timestamp: Date.now(),
    };

    // Reset elimination tracking and lock for new round
    room.players.forEach((player) => {
      player.hasEliminatedThisRound = false;
    });
    room.eliminationUsedThisRound = false; // Reset room-level elimination flag
    eliminationLocks[roomId] = false;
    console.log(
      `🔓 Elimination lock reset for room ${roomId} - new eliminations allowed`
    );

    // Apply special card powers if needed
    if (discardedCard.rank === "J") {
      // Jack: Skip the next player's turn
      const nextPlayerIndex =
        (room.currentPlayerIndex + 1) % room.players.length;
      room.players[nextPlayerIndex].skippedTurn = true;
      
      // Move to next player (Jack doesn't require player choice)
      moveToNextPlayer(room);
    } else if (["7", "8", "9", "10", "Q", "K"].includes(discardedCard.rank)) {
      // Power cards (7, 8, 9, 10, Q, K): Make power available for choice
      const playerIndex = room.players.findIndex((p) => p.id === playerId);
      if (playerIndex !== -1) {
        room.players[playerIndex].activePower = discardedCard.rank;
        room.players[playerIndex].usingPower = false; // Player needs to choose to use or skip
        console.log(
          `⚡ ${discardedCard.rank} power available for ${room.players[playerIndex].name} - awaiting choice`
        );
        
        // Fix #2: Add timeout to prevent stuck turns (30 seconds)
        if (!powerCardTimeouts[roomId]) {
          powerCardTimeouts[roomId] = {};
        }
        // Clear any existing timeout for this player
        if (powerCardTimeouts[roomId][playerId]) {
          clearTimeout(powerCardTimeouts[roomId][playerId]);
        }
        // Set new timeout
        powerCardTimeouts[roomId][playerId] = setTimeout(() => {
          const currentRoom = rooms[roomId];
          if (!currentRoom) return;
          const currentPlayer = currentRoom.players.find((p) => p.id === playerId);
          if (currentPlayer && currentPlayer.activePower === discardedCard.rank) {
            console.warn(`⏰ Power ${discardedCard.rank} timeout for ${currentPlayer.name} - auto-skipping`);
            currentPlayer.activePower = null;
            currentPlayer.usingPower = false;
            delete powerCardTimeouts[roomId][playerId];
            moveToNextPlayer(currentRoom);
            io.to(roomId).emit("game-state-update", prepareGameStateForEmit(currentRoom));
          }
        }, 30000); // 30 second timeout
        
        // DON'T move to next player yet - wait for power choice
        // Update game state for all players
        io.to(roomId).emit("game-state-update", prepareGameStateForEmit(room));
        console.log(`📤 Emitted game-state-update to room ${roomId}`);
        return; // Exit early - don't move turn yet
      }
    } else {
      // Regular card (A-6): Move to next player normally
      moveToNextPlayer(room);
    }

    console.log(`✅ Discard complete. Discard pile now has ${room.discardPile.length} cards. Top card: ${room.discardPile[room.discardPile.length - 1]?.rank}${room.discardPile[room.discardPile.length - 1]?.suit}`);

    // Update game state for all players
    io.to(roomId).emit("game-state-update", prepareGameStateForEmit(room));
    console.log(`📤 Emitted game-state-update to room ${roomId}`);
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

    // Opening elimination window: A card was discarded, so eliminations are now possible
    // Window will close when the next player draws a card
    room.eliminationUsedThisRound = false; // Reset to allow eliminations for this new discard
    eliminationLocks[roomId] = false; // Reset lock for new elimination opportunity
    // Note: Don't reset hasEliminatedThisRound here - it's only reset when next player draws

    // IMPORTANT: Cards that were in hand lose their powers when discarded
    // Only cards directly discarded from deck (via discard-drawn-card) have powers
    // So we do NOT activate powers for discardedCard here - just move to next player
    console.log(`ℹ️ Hand card ${discardedCard.rank}${discardedCard.suit} discarded - no powers (cards lose powers once in hand)`);
    
    // Move to next player normally (no powers for hand cards)
    moveToNextPlayer(room);

    // Update game state for all players
    io.to(roomId).emit("game-state-update", prepareGameStateForEmit(room));
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
    io.to(roomId).emit("game-state-update", prepareGameStateForEmit(room));
  });

  // Handle declaring (ending the game)
  socket.on("declare", ({ roomId, playerId, declaredRanks }) => {
    console.log(`📥 RECEIVED declare event - roomId: ${roomId}, playerId: ${playerId}, declaredRanks:`, declaredRanks);
    
    const room = rooms[roomId];
    if (!room || room.gameStatus !== "playing") {
      console.log(`❌ Cannot declare - room not found or game not playing`);
      socket.emit("error", { message: "Game not in playing state" });
      return;
    }

    // Check if it's this player's turn
    const currentPlayer = getCurrentPlayer(room);
    if (!currentPlayer || currentPlayer.id !== playerId) {
      console.log(`❌ Cannot declare - not player's turn`);
      socket.emit("error", { message: "Not your turn" });
      return;
    }

    // Find the player
    const playerIndex = room.players.findIndex((p) => p.id === playerId);

    if (playerIndex === -1) {
      console.log(`❌ Cannot declare - player not found`);
      socket.emit("error", { message: "Player not found" });
      return;
    }

    const declaringPlayer = room.players[playerIndex];
    
    // Validate declaration if declaredRanks are provided
    let isValidDeclaration = true;
    if (declaredRanks && Array.isArray(declaredRanks)) {
      // Get actual ranks from player's hand (filter out null cards)
      const actualCards = declaringPlayer.hand.filter(card => card !== null);
      const actualRanks = actualCards.map(card => card.rank);
      
      console.log(`🔍 Validating declaration - Declared:`, declaredRanks, `Actual:`, actualRanks);
      
      // Check if declared ranks match actual ranks (order matters)
      if (declaredRanks.length !== actualRanks.length) {
        isValidDeclaration = false;
        console.log(`❌ Declaration invalid - length mismatch`);
      } else {
        isValidDeclaration = declaredRanks.every((rank, index) => rank === actualRanks[index]);
        if (!isValidDeclaration) {
          console.log(`❌ Declaration invalid - ranks don't match`);
        }
      }
    }

    // Calculate round scores for all players (hand value only, not cumulative)
    const roundScores = room.players.map((player) => {
      // Reveal all cards (including null positions) - check for null before setting properties
      player.hand.forEach((card) => {
        if (card) {
          card.isRevealed = true;
        }
        // If card is null (eliminated), skip it
      });

      // Sum the values of cards (null cards = 0 points) - this is the round score
      const roundScore = player.hand.reduce((total, card) => {
        if (!card) return total; // Eliminated cards = 0
        return total + (card.value || 0);
      }, 0);
      
      return { id: player.id, name: player.name, roundScore };
    });

    // Apply penalty for invalid declaration (adds to round score)
    if (!isValidDeclaration) {
      console.log(`⚠️ Invalid declaration - applying +20 penalty to ${declaringPlayer.name}`);
      const declaringPlayerRoundScore = roundScores.find(s => s.id === playerId);
      if (declaringPlayerRoundScore) {
        declaringPlayerRoundScore.roundScore += 20;
      }
    }

    // Find winner(s) - lowest round score wins
    const minRoundScore = Math.min(...roundScores.map(s => s.roundScore));
    const winners = roundScores.filter(s => s.roundScore === minRoundScore);
    
    // If declarer tied for lowest, they lose (declarer must have strictly lowest to win)
    const finalWinners = winners.filter(w => {
      if (w.id === playerId && winners.length > 1) {
        // Declarer tied for lowest - they lose
        console.log(`   ⚠️ Declarer ${declaringPlayer.name} tied for lowest score - they lose`);
        return false;
      }
      return true;
    });

    // Calculate points for this round:
    // - Losers get negative points equal to their round score
    // - Winner gets sum of all negative points from losers
    const roundPoints = roundScores.map((playerRoundScore) => {
      const isWinner = finalWinners.some(w => w.id === playerRoundScore.id);
      
      if (isWinner) {
        // Winner: sum of all negative points from losers
        const totalNegativePoints = roundScores
          .filter(p => !finalWinners.some(w => w.id === p.id))
          .reduce((sum, loser) => sum + loser.roundScore, 0);
        
        return {
          id: playerRoundScore.id,
          name: playerRoundScore.name,
          roundScore: playerRoundScore.roundScore,
          roundPoints: totalNegativePoints, // Winner gets positive points (sum of losers' scores)
          isWinner: true
        };
      } else {
        // Loser: negative points equal to round score
        return {
          id: playerRoundScore.id,
          name: playerRoundScore.name,
          roundScore: playerRoundScore.roundScore,
          roundPoints: -playerRoundScore.roundScore, // Loser gets negative points
          isWinner: false
        };
      }
    });

    // Update cumulative scores (add round points to existing score)
    roundPoints.forEach((playerPoints) => {
      const player = room.players.find(p => p.id === playerPoints.id);
      if (player) {
        // Initialize cumulative score if not set (for first round)
        if (player.cumulativeScore === undefined) {
          player.cumulativeScore = 0;
        }
        // Add round points to cumulative score
        player.cumulativeScore += playerPoints.roundPoints;
        // Also keep round score for display
        player.roundScore = playerPoints.roundScore;
        console.log(`   ${player.name}: Round score=${playerPoints.roundScore}, Round points=${playerPoints.roundPoints}, Cumulative=${player.cumulativeScore}`);
      }
    });

    // Set game to ended
    room.gameStatus = "ended";
    room.declarer = playerId;

    // Record this action
    room.lastAction = {
      type: "declare",
      playerId: playerId,
      timestamp: Date.now(),
      isValid: isValidDeclaration,
      declaredRanks: declaredRanks || null,
    };

    console.log(`🏆 Game ended! Declarer: ${declaringPlayer.name}, Valid: ${isValidDeclaration}`);
    console.log(`   Round scores:`, roundScores.map(s => `${s.name}: ${s.roundScore}`).join(", "));
    console.log(`   Round points:`, roundPoints.map(p => `${p.name}: ${p.roundPoints}${p.isWinner ? ' (WINNER)' : ''}`).join(", "));
    console.log(`   Cumulative scores:`, room.players.map(p => `${p.name}: ${p.cumulativeScore || 0}`).join(", "));
    console.log(`   Winners:`, finalWinners.map(w => w.name).join(", "));

    // Prepare scores for client (include both round and cumulative)
    // Also update player objects in room so gameState includes these fields
    const scoresForClient = room.players.map((player) => {
      const playerPoints = roundPoints.find(p => p.id === player.id);
      const scoreData = {
        id: player.id,
        name: player.name,
        roundScore: playerPoints?.roundScore || 0,
        roundPoints: playerPoints?.roundPoints || 0,
        cumulativeScore: player.cumulativeScore || 0,
        isWinner: playerPoints?.isWinner || false
      };
      
      // Update player object in room with new score fields
      player.roundScore = scoreData.roundScore;
      player.roundPoints = scoreData.roundPoints;
      player.isWinner = scoreData.isWinner;
      
      return scoreData;
    });

    // Notify all players of the game end and scores
    const winnersForClient = finalWinners.map(w => ({
      id: w.id,
      name: w.name,
      roundScore: roundScores.find(s => s.id === w.id)?.roundScore || 0
    }));
    
    console.log(`📤 Sending game-ended event with winners:`, winnersForClient.map(w => w.name).join(", "));
    
    io.to(roomId).emit("game-ended", {
      declarer: playerId,
      declarerName: declaringPlayer.name,
      isValid: isValidDeclaration,
      scores: scoresForClient,
      winners: winnersForClient,
      declaredRanks: declaredRanks || null,
    });

    // Update game state for all players
    io.to(roomId).emit("game-state-update", prepareGameStateForEmit(room));
    
    console.log(`📤 Emitted game-ended and game-state-update to room ${roomId}`);
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
    io.to(roomId).emit("game-state-update", prepareGameStateForEmit(room));
  });

  // Handle using power on own card (7, 8 powers)
  socket.on("use-power-on-own-card", ({ roomId, playerId, cardIndex }) => {
    const room = rooms[roomId];
    if (!room || room.gameStatus !== "playing") return;

    // Check if player is in the game
    const playerIndex = room.players.findIndex((p) => p.id === playerId);

    if (playerIndex === -1) {
      socket.emit("error", { message: "Player not found" });
      return;
    }

    // Check if player has an active power
    const player = room.players[playerIndex];
    if (!player.activePower || !["7", "8"].includes(player.activePower)) {
      socket.emit("error", { message: "No valid power available" });
      return;
    }

    // Check if card exists
    if (!player.hand[cardIndex]) {
      socket.emit("error", { message: "Card not found" });
      return;
    }

    // Get the card (DO NOT permanently reveal - it's a temporary peek)
    const card = player.hand[cardIndex];
    
    // Add card to known cards (player remembers what they saw)
    if (!player.knownCards.includes(card.id)) {
      player.knownCards.push(card.id);
    }

    // Log the power usage before clearing
    console.log(
      `[${player.name}] Used ${player.activePower} power to peek at own card ${card.rank} of ${card.suit} (temporary reveal)`
    );

    // Clear the active power
    player.activePower = null;
    player.usingPower = false;

    // Fix #2: Clear timeout when power is used
    if (powerCardTimeouts[roomId] && powerCardTimeouts[roomId][playerId]) {
      clearTimeout(powerCardTimeouts[roomId][playerId]);
      delete powerCardTimeouts[roomId][playerId];
    }

    // Send power peek result for own card (temporary reveal - client will hide after 5 seconds)
    socket.emit("power-peek-result", {
      card: { ...card, isRevealed: false }, // Send card info but mark as not permanently revealed
      targetPlayer: `${player.name} (You)`,
      cardIndex,
    });

    // Move to next player
    moveToNextPlayer(room);

    // Update game state
    io.to(roomId).emit("game-state-update", prepareGameStateForEmit(room));
  });

  // Handle activating a power (player chooses to use it)
  socket.on("activate-power", ({ roomId, playerId, powerType }) => {
    const room = rooms[roomId];
    if (!room || room.gameStatus !== "playing") return;

    // Check if player is in the game
    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) {
      socket.emit("error", { message: "Player not found" });
      return;
    }

    const player = room.players[playerIndex];

    // Check if player has the matching active power
    if (!player.activePower || player.activePower !== powerType) {
      socket.emit("error", { message: "No matching power available to activate" });
      return;
    }

    console.log(
      `[${player.name}] Activated ${powerType} power - now using it`
    );

    // Set usingPower to true so player can use the power
    player.usingPower = true;

    // Update game state
    io.to(roomId).emit("game-state-update", prepareGameStateForEmit(room));
  });

  // Handle skipping a power (player chooses not to use it)
  socket.on("skip-power", ({ roomId, playerId, powerType }) => {
    const room = rooms[roomId];
    if (!room || room.gameStatus !== "playing") return;

    // Check if player is in the game
    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) {
      socket.emit("error", { message: "Player not found" });
      return;
    }

    const player = room.players[playerIndex];

    // Check if player has the matching active power
    if (!player.activePower || player.activePower !== powerType) {
      socket.emit("error", { message: "No matching power available to skip" });
      return;
    }

    console.log(
      `[${player.name}] Skipped ${powerType} power`
    );

    // Clear the active power
    player.activePower = null;
    player.usingPower = false;

    // Fix #2: Clear timeout when power is skipped
    if (powerCardTimeouts[roomId] && powerCardTimeouts[roomId][playerId]) {
      clearTimeout(powerCardTimeouts[roomId][playerId]);
      delete powerCardTimeouts[roomId][playerId];
    }

    // Move to next player since power was skipped
    moveToNextPlayer(room);

    // Update game state
    io.to(roomId).emit("game-state-update", prepareGameStateForEmit(room));
  });

  // Handle using power on opponent card (9, 10 powers)
  socket.on(
    "use-power-on-opponent-card",
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

      // Check if player has an active power
      const player = room.players[playerIndex];
      if (!player.activePower || !["9", "10"].includes(player.activePower)) {
        socket.emit("error", { message: "No valid power available" });
        return;
      }

      // Check if target card exists
      const targetPlayer = room.players[targetPlayerIndex];
      if (!targetPlayer.hand[cardIndex]) {
        socket.emit("error", { message: "Target card not found" });
        return;
      }

      // Reveal the card for the player using the power
      const card = targetPlayer.hand[cardIndex];
      const revealedCard = { ...card, isRevealed: true };

      // Log the power usage before clearing
      console.log(
        `[${player.name}] Used ${player.activePower} power to peek at ${targetPlayer.name}'s ${card.rank} of ${card.suit}`
      );

      // Clear the active power
      player.activePower = null;
      player.usingPower = false;

      // Fix #2: Clear timeout when power is used
      if (powerCardTimeouts[roomId] && powerCardTimeouts[roomId][playerId]) {
        clearTimeout(powerCardTimeouts[roomId][playerId]);
        delete powerCardTimeouts[roomId][playerId];
      }

      // Send card reveal to the player who used the power
      socket.emit("power-peek-result", {
        card: revealedCard,
        targetPlayer: targetPlayer.name,
        targetPlayerId,
        cardIndex,
      });

      // Move to next player
      moveToNextPlayer(room);

      // Update game state
      io.to(roomId).emit("game-state-update", prepareGameStateForEmit(room));
    }
  );

  // Handle using power to swap cards (Q and K powers)
  socket.on(
    "use-power-swap",
    ({
      roomId,
      playerId,
      card1PlayerId,
      card1Index,
      card2PlayerId,
      card2Index,
    }) => {
      const room = rooms[roomId];
      if (!room || room.gameStatus !== "playing") return;

      // Check if player is in the game
      const playerIndex = room.players.findIndex((p) => p.id === playerId);
      if (playerIndex === -1) {
        socket.emit("error", { message: "Player not found" });
        return;
      }

      const player = room.players[playerIndex];

      // Check if player has an active Q or K power
      if (!player.activePower || !["Q", "K"].includes(player.activePower)) {
        socket.emit("error", { message: "No valid swap power available" });
        return;
      }

      // Prevent same-player swaps
      if (card1PlayerId === card2PlayerId) {
        socket.emit("error", {
          message: "Cannot swap cards within the same player's hand",
        });
        return;
      }

      // Find the players who own the cards
      const player1Index = room.players.findIndex((p) => p.id === card1PlayerId);
      const player2Index = room.players.findIndex((p) => p.id === card2PlayerId);

      if (player1Index === -1 || player2Index === -1) {
        socket.emit("error", { message: "Card owner not found" });
        return;
      }

      // Check if cards exist
      const card1 = room.players[player1Index].hand[card1Index];
      const card2 = room.players[player2Index].hand[card2Index];

      if (!card1 || !card2 || card1 === null || card2 === null) {
        socket.emit("error", { message: "One or both cards not found" });
        return;
      }

      const player1Name = room.players[player1Index].name;
      const player2Name = room.players[player2Index].name;

      // For K (King) power: Show preview first, then wait for confirmation
      if (player.activePower === "K") {
        console.log(
          `👁️ K Power: Revealing both cards to ${player.name} for confirmation`
        );

        // Send preview to the power wielder only
        socket.emit("king-power-preview", {
          powerUserId: playerId,
          powerUserName: player.name,
          card1: {
            card: card1,
            playerId: card1PlayerId,
            playerName: player1Name,
            cardIndex: card1Index,
          },
          card2: {
            card: card2,
            playerId: card2PlayerId,
            playerName: player2Name,
            cardIndex: card2Index,
          },
          message: `Do you want to swap ${card1.rank} (${player1Name}) with ${card2.rank} (${player2Name})?`,
          swapData: {
            card1PlayerId,
            card1Index,
            card2PlayerId,
            card2Index,
          },
        });
      } else {
        // For Q (Queen) power: Swap immediately without revealing
        console.log(`🔄 Q Power: Unseen swap by ${player.name}`);

        // Perform the swap - ensure cards are NOT revealed (unseen swap)
        const card1Position = card1.position;
        const card2Position = card2.position;

        // Create new card objects with isRevealed: false to ensure unseen swap
        const swappedCard1 = { ...card1, position: card2Position, isRevealed: false };
        const swappedCard2 = { ...card2, position: card1Position, isRevealed: false };

        room.players[player1Index].hand[card1Index] = swappedCard2;
        room.players[player2Index].hand[card2Index] = swappedCard1;

        console.log(
          `🔄 ${player.name} used Q power: swapped ${card2.rank} (${player1Name}) ↔ ${card1.rank} (${player2Name})`
        );

        // Clear the active power
        player.activePower = null;
        player.usingPower = false;

        // Fix #2: Clear timeout when power is used
        if (powerCardTimeouts[roomId] && powerCardTimeouts[roomId][playerId]) {
          clearTimeout(powerCardTimeouts[roomId][playerId]);
          delete powerCardTimeouts[roomId][playerId];
        }

        // Move to next player
        moveToNextPlayer(room);

        // Broadcast the completed swap
        io.to(roomId).emit("power-swap-completed", {
          powerUserId: playerId,
          powerUserName: player.name,
          power: "Q",
          swapDetails: {
            player1Name,
            player2Name,
            card1Rank: card2.rank,
            card2Rank: card1.rank,
          },
        });

        // Update game state
        io.to(roomId).emit("game-state-update", prepareGameStateForEmit(room));
      }
    }
  );

  // Handle confirming King power swap after preview
  socket.on(
    "confirm-king-power-swap",
    ({
      roomId,
      playerId,
      card1PlayerId,
      card1Index,
      card2PlayerId,
      card2Index,
    }) => {
      const room = rooms[roomId];
      if (!room || room.gameStatus !== "playing") return;

      // Check if player is in the game
      const playerIndex = room.players.findIndex((p) => p.id === playerId);
      if (playerIndex === -1) {
        socket.emit("error", { message: "Player not found" });
        return;
      }

      const player = room.players[playerIndex];

      // Check if player has active K power
      if (!player.activePower || player.activePower !== "K") {
        socket.emit("error", { message: "No active King power" });
        return;
      }

      // Find the players who own the cards
      const player1Index = room.players.findIndex((p) => p.id === card1PlayerId);
      const player2Index = room.players.findIndex((p) => p.id === card2PlayerId);

      if (player1Index === -1 || player2Index === -1) {
        socket.emit("error", { message: "Card owner not found" });
        return;
      }

      // Check if cards exist
      const card1 = room.players[player1Index].hand[card1Index];
      const card2 = room.players[player2Index].hand[card2Index];

      if (!card1 || !card2 || card1 === null || card2 === null) {
        socket.emit("error", { message: "One or both cards not found" });
        return;
      }

      const player1Name = room.players[player1Index].name;
      const player2Name = room.players[player2Index].name;

      // Perform the swap - ensure cards are NOT revealed (unseen swap for K power too)
      const card1Position = card1.position;
      const card2Position = card2.position;

      // Create new card objects with isRevealed: false to ensure cards remain hidden
      const swappedCard1 = { ...card1, position: card2Position, isRevealed: false };
      const swappedCard2 = { ...card2, position: card1Position, isRevealed: false };

      room.players[player1Index].hand[card1Index] = swappedCard2;
      room.players[player2Index].hand[card2Index] = swappedCard1;

      console.log(
        `🔄 ${player.name} confirmed K power: swapped ${card2.rank} (${player1Name}) ↔ ${card1.rank} (${player2Name})`
      );

      // Clear the active power
      player.activePower = null;
      player.usingPower = false;

      // Fix #2: Clear timeout when power is used
      if (powerCardTimeouts[roomId] && powerCardTimeouts[roomId][playerId]) {
        clearTimeout(powerCardTimeouts[roomId][playerId]);
        delete powerCardTimeouts[roomId][playerId];
      }

      // Move to next player
      moveToNextPlayer(room);

      // Broadcast the completed swap
      io.to(roomId).emit("power-swap-completed", {
        powerUserId: playerId,
        powerUserName: player.name,
        power: "K",
        swapDetails: {
          player1Name,
          player2Name,
          card1Rank: card2.rank,
          card2Rank: card1.rank,
        },
      });

      // Update game state
      io.to(roomId).emit("game-state-update", prepareGameStateForEmit(room));
    }
  );

  // Handle cancelling King power swap
  socket.on("cancel-king-power-swap", ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (!room || room.gameStatus !== "playing") return;

    // Check if player is in the game
    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) {
      socket.emit("error", { message: "Player not found" });
      return;
    }

    const player = room.players[playerIndex];

    // Check if player has active K power
    if (!player.activePower || player.activePower !== "K") {
      socket.emit("error", { message: "No active King power" });
      return;
    }

    console.log(`❌ ${player.name} cancelled King power swap`);

    // Clear the active power
    player.activePower = null;
    player.usingPower = false;

    // Fix #2: Clear timeout when power is cancelled
    if (powerCardTimeouts[roomId] && powerCardTimeouts[roomId][playerId]) {
      clearTimeout(powerCardTimeouts[roomId][playerId]);
      delete powerCardTimeouts[roomId][playerId];
    }

    // Move to next player (power cancelled, turn ends)
    console.log(`🔄 Moving to next player after King power cancellation`);
    moveToNextPlayer(room);

    // Update game state
    io.to(roomId).emit("game-state-update", prepareGameStateForEmit(room));
    console.log(`📤 Emitted game-state-update after King power cancellation`);
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
      io.to(roomId).emit("game-state-update", prepareGameStateForEmit(rooms[roomId]));
    }

    // Leave the socket room
    socket.leave(roomId);
  });

  // Handle card elimination
  socket.on("eliminate-card", ({ roomId, playerId, cardId }) => {
    const room = rooms[roomId];
    if (!room || room.gameStatus !== "playing") return;

    // Check if elimination is already in progress for this room
    if (eliminationLocks[roomId]) {
      console.log(
        `🔒 Elimination already in progress for room ${roomId} - blocking ${playerId}`
      );
      socket.emit("error", { message: "Another elimination is in progress" });
      return;
    }

    // Find the player trying to eliminate
    const eliminatingPlayerIndex = room.players.findIndex(
      (p) => p.id === playerId
    );
    if (eliminatingPlayerIndex === -1) {
      socket.emit("error", { message: "Player not found" });
      return;
    }

    // Check if ANY player has already eliminated a card this round (only one elimination per round total)
    if (room.eliminationUsedThisRound) {
      console.log("An elimination has already been used this round");
      socket.emit("error", {
        message: "Only one elimination is allowed per round. Someone has already eliminated a card.",
      });
      return;
    }

    // Don't set lock yet - wait to see if elimination is valid

    // Find which player owns the card being eliminated
    let cardOwnerIndex = -1;
    let cardIndex = -1;
    let cardToEliminate = null;

    for (let i = 0; i < room.players.length; i++) {
      const foundCardIndex = room.players[i].hand.findIndex(
        (c) => c && c.id === cardId
      );
      if (foundCardIndex !== -1) {
        cardOwnerIndex = i;
        cardIndex = foundCardIndex;
        cardToEliminate = room.players[i].hand[foundCardIndex];
        break;
      }
    }

    if (cardOwnerIndex === -1 || cardIndex === -1 || !cardToEliminate) {
      socket.emit("error", { message: "Card not found or already eliminated" });
      return;
    }

    // Check if elimination is valid (matches top discard card rank)
    const topDiscardCard =
      room.discardPile.length > 0
        ? room.discardPile[room.discardPile.length - 1]
        : null;

    const canEliminate =
      topDiscardCard && topDiscardCard.rank === cardToEliminate.rank;

    if (canEliminate) {
      // Valid elimination - NOW set the lock to prevent others
      eliminationLocks[roomId] = true;
      console.log(
        `🔒 Elimination lock set for room ${roomId} by ${playerId} after VALID elimination`
      );

      const eliminatedCard = { ...cardToEliminate };

      console.log(
        `✅ ${room.players[eliminatingPlayerIndex].name} eliminated ${eliminatedCard.rank} from ${room.players[cardOwnerIndex].name}`
      );

      // Add the eliminated card to discard pile
      room.discardPile.push(eliminatedCard);

      // Set the eliminated position to null
      room.players[cardOwnerIndex].hand[cardIndex] = null;

      // Mark that an elimination has been used this round (room-level, prevents other players)
      // The window will close when the next player draws a card
      room.eliminationUsedThisRound = true;
      
      // Track which player eliminated (for UI/display purposes only - doesn't affect turns)
      room.players[eliminatingPlayerIndex].hasEliminatedThisRound = true;

      console.log(`🔴 Room ${roomId} - eliminationUsedThisRound set to TRUE`);
      console.log(`🔴 Room state:`, {
        eliminationUsedThisRound: room.eliminationUsedThisRound,
        type: typeof room.eliminationUsedThisRound,
        hasProperty: 'eliminationUsedThisRound' in room,
        players: room.players.map(p => ({ name: p.name, hasEliminated: p.hasEliminatedThisRound }))
      });

      // Send immediate state update to hide elimination buttons for all players
      // Use helper to ensure field is always included
      const stateToEmit = prepareGameStateForEmit(room);
      console.log(`📤 Prepared state:`, {
        eliminationUsedThisRound: stateToEmit.eliminationUsedThisRound,
        type: typeof stateToEmit.eliminationUsedThisRound,
        hasProperty: 'eliminationUsedThisRound' in stateToEmit,
        allKeys: Object.keys(stateToEmit)
      });
      io.to(roomId).emit("game-state-update", stateToEmit);
      console.log(`📤 Emitted immediate game-state-update after elimination`);

      // Only require card selection if eliminating ANOTHER player's card
      if (eliminatingPlayerIndex !== cardOwnerIndex) {
        // Emit elimination card selection required event for opponent's card
        io.to(roomId).emit("elimination-card-selection-required", {
          eliminatingPlayerId: playerId,
          cardOwnerId: room.players[cardOwnerIndex].id,
          cardOwnerName: room.players[cardOwnerIndex].name,
          cardIndex: cardIndex,
          eliminatedCard: eliminatedCard,
        });

        console.log(
          `🔒 Elimination lock remains active for room ${roomId} - waiting for card selection`
        );
      } else {
        // Player eliminated their own card - no card exchange needed
        console.log(
          `✅ Player eliminated their own card - no card exchange needed`
        );

        // Release elimination lock since no card selection is needed
        eliminationLocks[roomId] = false;

        // Note: Keep room.eliminationUsedThisRound = true to prevent other players from eliminating
        // Only reset player-level flag for non-eliminators (they can still play normally)
        room.players.forEach((player) => {
          if (player.id !== playerId) {
            player.hasEliminatedThisRound = false;
          }
        });

        // Preserve power if eliminated card matches the power rank
        const eliminatingPlayer = room.players[eliminatingPlayerIndex];
        if (eliminatingPlayer.activePower && eliminatedCard.rank === eliminatingPlayer.activePower) {
          console.log(
            `🔋 Preserving ${eliminatingPlayer.activePower} power for ${eliminatingPlayer.name} - eliminated card matches power rank`
          );
        } else if (eliminatingPlayer.activePower) {
          // Clear power if it doesn't match
          console.log(
            `🧹 Clearing ${eliminatingPlayer.activePower} power for ${eliminatingPlayer.name} - eliminated card (${eliminatedCard.rank}) doesn't match`
          );
          eliminatingPlayer.activePower = null;
          eliminatingPlayer.usingPower = false;
          
          // Clear timeout if exists
          if (powerCardTimeouts[roomId] && powerCardTimeouts[roomId][playerId]) {
            clearTimeout(powerCardTimeouts[roomId][playerId]);
            delete powerCardTimeouts[roomId][playerId];
          }
        }

        // Eliminations are independent of turns - they do NOT affect turn progression
        // Player can still draw normally on their turn regardless of elimination
        const currentPlayer = getCurrentPlayer(room);
        if (currentPlayer && currentPlayer.id === playerId) {
          console.log(
            `ℹ️ ${room.players[eliminatingPlayerIndex].name} eliminated their own card during their turn - can still draw normally`
          );
        } else {
          console.log(
            `ℹ️ ${room.players[eliminatingPlayerIndex].name} eliminated during another player's turn - can still draw normally on their turn`
          );
        }
      }

      // Record this action
      room.lastAction = {
        type: "elimination",
        playerId: playerId,
        cardId: cardId,
        timestamp: Date.now(),
        message: "Valid elimination completed",
      };

      // Update game state for all players - ensure eliminationUsedThisRound is included
      io.to(roomId).emit("game-state-update", prepareGameStateForEmit(room));
    } else {
      // Invalid elimination - apply penalty
      console.log("❌ Invalid elimination - applying penalty");

      if (room.deck.length > 0) {
        const penaltyCard = room.deck.pop();
        penaltyCard.isRevealed = false;

        // Add penalty card to eliminating player's hand
        room.players[eliminatingPlayerIndex].hand.push(penaltyCard);

        io.to(roomId).emit("penalty-card", {
          playerId,
          penaltyCard,
          reason: "Invalid elimination attempt",
        });
      }

      // Don't set hasEliminatedThisRound for invalid eliminations - let them try again!

      // Record this action
      room.lastAction = {
        type: "elimination",
        playerId: playerId,
        cardId: cardId,
        timestamp: Date.now(),
        message: "Invalid elimination attempt",
      };

      // Update game state for all players - ensure eliminationUsedThisRound is included
      io.to(roomId).emit("game-state-update", prepareGameStateForEmit(room));
    }
  });

  // Handle completion of elimination card give
  socket.on(
    "complete-elimination-card-give",
    ({
      roomId,
      eliminatingPlayerId,
      cardOwnerId,
      cardOwnerName,
      selectedCardIndex,
      targetCardIndex,
      eliminatedCard,
    }) => {
      const room = rooms[roomId];
      if (!room || room.gameStatus !== "playing") return;

      // Find the players
      const eliminatingPlayerIndex = room.players.findIndex(
        (p) => p.id === eliminatingPlayerId
      );
      const cardOwnerIndex = room.players.findIndex(
        (p) => p.id === cardOwnerId
      );

      if (eliminatingPlayerIndex === -1 || cardOwnerIndex === -1) {
        socket.emit("error", { message: "Player not found" });
        return;
      }

      const eliminatingPlayer = room.players[eliminatingPlayerIndex];
      const cardOwner = room.players[cardOwnerIndex];

      // Get the card to give from eliminating player
      const cardToGive = eliminatingPlayer.hand[selectedCardIndex];

      if (!cardToGive) {
        socket.emit("error", { message: "Selected card not found" });
        return;
      }

      console.log(
        `🎁 ${eliminatingPlayer.name} giving ${cardToGive.rank} to ${cardOwner.name} at position ${targetCardIndex}`
      );

      // Perform the card transfer
      // 1. Place the given card in the eliminated card's position
      cardOwner.hand[targetCardIndex] = { ...cardToGive };

      // 2. Replace the given card with null in eliminating player's hand
      eliminatingPlayer.hand[selectedCardIndex] = null;

      // Reset elimination tracking for the next round
      room.players.forEach((player, idx) => {
        if (idx !== eliminatingPlayerIndex) {
          player.hasEliminatedThisRound = false;
        }
      });

      // Clear any active powers, BUT preserve power if eliminated card matches the power rank
      room.players.forEach((player) => {
        if (player.activePower) {
          // Check if this is the eliminating player and if the eliminated card matches their power
          const isEliminatingPlayer = player.id === eliminatingPlayerId;
          const eliminatedCardMatchesPower = eliminatedCard && eliminatedCard.rank === player.activePower;
          
          if (isEliminatingPlayer && eliminatedCardMatchesPower) {
            // Preserve the power - the eliminated card matches the power rank
            console.log(
              `🔋 Preserving ${player.activePower} power for ${player.name} - eliminated card matches power rank`
            );
          } else {
            // Clear the power normally
            player.activePower = null;
            player.usingPower = false;
            
            // Clear timeout if exists
            if (powerCardTimeouts[roomId] && powerCardTimeouts[roomId][player.id]) {
              clearTimeout(powerCardTimeouts[roomId][player.id]);
              delete powerCardTimeouts[roomId][player.id];
            }
          }
        }
      });

      // Release elimination lock
      eliminationLocks[roomId] = false;
      console.log(
        `🔓 Elimination lock released for room ${roomId} after card exchange`
      );

      // Eliminations are independent of turns - no turn advancement needed
      // The elimination window will close when the next player draws a card

      // Update game state
      room.lastAction = {
        type: "elimination-completed",
        playerId: eliminatingPlayerId,
        timestamp: Date.now(),
        message: "Elimination card transfer completed",
      };

      io.to(roomId).emit("game-state-update", prepareGameStateForEmit(room));
    }
  );

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

        // Check if all players are disconnected
        const allDisconnected = rooms[roomId].players.every(
          (p) => !p.connected
        );

        if (allDisconnected && rooms[roomId].gameStatus === "playing") {
          // Reset room to lobby state
          console.log(
            `All players disconnected from room ${roomId}, resetting to lobby`
          );
          rooms[roomId].gameStatus = "waiting";
          rooms[roomId].deck = [];
          rooms[roomId].discardPile = [];
          rooms[roomId].currentPlayerIndex = 0;
          rooms[roomId].drawnCard = null;
          rooms[roomId].drawnCardPlayer = null;
          rooms[roomId].lastAction = null;

          // Reset player states (but preserve cumulative scores)
          rooms[roomId].players.forEach((player) => {
            player.hand = [];
            player.score = 0; // Legacy field
            player.roundScore = 0; // Reset round score
            // Keep cumulativeScore - don't reset it
            player.knownCards = [];
            player.skippedTurn = false;
            player.hasEliminatedThisRound = false;
            player.activePower = null;
            player.usingPower = false;
          });
        }

        // Update players in room
        io.to(roomId).emit("update-players", rooms[roomId].players);
        io.to(roomId).emit("game-state-update", prepareGameStateForEmit(rooms[roomId]));
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
// Listen on all interfaces (0.0.0.0) to allow network access from phones
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Server accessible on network at http://<your-ip>:${PORT}`);
  
  // Try to detect and log the actual network IP
  const networkInterfaces = os.networkInterfaces();
  const addresses = [];
  for (const interfaceName in networkInterfaces) {
    for (const iface of networkInterfaces[interfaceName]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === "IPv4" && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  if (addresses.length > 0) {
    console.log(`🌐 Network IPs detected: ${addresses.join(", ")}`);
    console.log(`   Try connecting from other devices using: http://${addresses[0]}:${PORT}`);
  } else {
    console.log(`⚠️  Could not detect network IP. Make sure your device is on a network.`);
  }
});
