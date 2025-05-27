import React from "react";
import { useGameContext } from "./contexts/GameContext";
import socket from "./socket";

const TestControlPanel: React.FC = () => {
  let playerCount = 0;
  const { gameState, roomId, playerName, setDrawnCard, drawnCard, myPlayer } =
    useGameContext();

  // Generate a test card
  const generateTestCard = () => {
    const suits = ["hearts", "diamonds", "clubs", "spades"] as const;
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
    ] as const;

    const randomSuit = suits[Math.floor(Math.random() * suits.length)];
    const randomRank = ranks[Math.floor(Math.random() * ranks.length)];

    const value =
      randomRank === "A"
        ? 1
        : randomRank === "J"
        ? 11
        : randomRank === "Q"
        ? 12
        : randomRank === "K"
        ? randomSuit === "hearts" || randomSuit === "diamonds"
          ? 0
          : 13
        : parseInt(randomRank);

    return {
      id: `test-${Math.random().toString(36).substring(2, 9)}`,
      suit: randomSuit,
      rank: randomRank,
      value,
      isRevealed: true,
    };
  };

  // Add a random card to player's hand
  const addRandomCard = () => {
    if (!roomId || !myPlayer) return;

    const newCard = generateTestCard();

    if (gameState && myPlayer) {
      const playerIndex = gameState.players.findIndex(
        (p) => p.id === myPlayer.id
      );

      if (playerIndex !== -1) {
        const updatedGameState = { ...gameState };
        updatedGameState.players[playerIndex].hand.push({
          ...newCard,
          position: updatedGameState.players[playerIndex].hand.length,
        });

        // Emit updated game state (for testing)
        socket.emit("game-state-update", updatedGameState);
      }
    }
  };

  // Simulate drawing a card
  const simulateDrawCard = () => {
    const drawnCard = generateTestCard();
    setDrawnCard(drawnCard);
  };

  // Simulate game end
  const simulateGameEnd = () => {
    if (!roomId) return;

    // Update game state to ended and reveal all cards
    if (gameState) {
      const updatedGameState = { ...gameState };
      updatedGameState.gameStatus = "ended";

      // Reveal all cards and assign random scores
      updatedGameState.players.forEach((player) => {
        player.hand.forEach((card) => {
          card.isRevealed = true;
        });
        player.score = Math.floor(Math.random() * 50);
      });

      // Set a random declarer
      const randomPlayerIndex = Math.floor(
        Math.random() * updatedGameState.players.length
      );
      updatedGameState.declarer =
        updatedGameState.players[randomPlayerIndex].id;

      // Emit game ended and updated state
      socket.emit("game-ended", {
        winner: updatedGameState.declarer,
        score: updatedGameState.players[randomPlayerIndex].score,
      });

      socket.emit("game-state-update", updatedGameState);
    }
  };

  // Toggle current player turn
  const togglePlayerTurn = () => {
    if (!gameState) return;

    const updatedGameState = { ...gameState };
    if (myPlayer) {
      const playerIndex = updatedGameState.players.findIndex(
        (p) => p.id === myPlayer.id
      );

      if (playerIndex !== -1) {
        updatedGameState.currentPlayerIndex =
          updatedGameState.currentPlayerIndex === playerIndex
            ? (playerIndex + 1) % updatedGameState.players.length
            : playerIndex;

        socket.emit("game-state-update", updatedGameState);
      }
    }
  };

  // Reveal all cards in player's hand
  const revealAllCards = () => {
    if (!gameState || !myPlayer) return;

    const updatedGameState = { ...gameState };
    const playerIndex = updatedGameState.players.findIndex(
      (p) => p.id === myPlayer.id
    );

    if (playerIndex !== -1) {
      updatedGameState.players[playerIndex].hand.forEach((card) => {
        card.isRevealed = true;
      });

      socket.emit("game-state-update", updatedGameState);
    }
  };

  // Add test player
  // Add test player
  const addTestPlayer = () => {
    if (!gameState || !roomId) return;

    const updatedGameState = { ...gameState };
    playerCount = updatedGameState.players.length;
    // Create a test player
    const testPlayer = {
      id: `test-player-${playerCount + 1}`,
      name: `Test Player ${playerCount + 1}`,
      isHost: false,
      hand: Array(4)
        .fill(null)
        .map(() => ({
          ...generateTestCard(),
          isRevealed: false,
        })),
      score: 0,
      knownCards: [],
      skippedTurn: false,
      hasEliminatedThisRound: false, // Add this line
    };

    updatedGameState.players.push(testPlayer);
    socket.emit("game-state-update", updatedGameState);
  };

  return (
    <div
      className="fixed bottom-4 right-4 bg-gray-800 p-4 rounded-lg shadow-lg opacity-80 hover:opacity-100 z-50 transition-opacity text-sm"
      style={{ top: 0 }}
    >
      <h3 className="text-white font-bold mb-2 text-center">Test Controls</h3>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={simulateDrawCard}
          className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
        >
          Simulate Draw
        </button>
        <button
          onClick={addRandomCard}
          className="px-2 py-1 bg-green-600 text-white rounded text-xs"
        >
          Add Card
        </button>
        <button
          onClick={togglePlayerTurn}
          className="px-2 py-1 bg-yellow-600 text-white rounded text-xs"
        >
          Toggle Turn
        </button>
        <button
          onClick={revealAllCards}
          className="px-2 py-1 bg-purple-600 text-white rounded text-xs"
        >
          Reveal Cards
        </button>
        <button
          onClick={addTestPlayer}
          className="px-2 py-1 bg-indigo-600 text-white rounded text-xs"
        >
          Add Player
        </button>
        <button
          onClick={simulateGameEnd}
          className="px-2 py-1 bg-red-600 text-white rounded text-xs"
        >
          End Game
        </button>
      </div>

      <div className="mt-2 text-xs text-gray-300">
        <p>Room: {roomId || "None"}</p>
        <p>Player: {playerName || "None"}</p>
        <p>Status: {gameState?.gameStatus || "Unknown"}</p>
        <p>Cards in hand: {myPlayer?.hand.length || 0}</p>
      </div>
    </div>
  );
};

export default TestControlPanel;
