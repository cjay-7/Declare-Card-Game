// client/src/components/GameBoard.tsx - Updated with player switching
import React, { useEffect, useState } from "react";
import socket from "../socket";
import { useGameContext } from "../contexts/GameContext";
import Card from "./Card";
import Deck from "./Deck";
import DiscardPile from "./DiscardPile";
import ActionPanel from "./ActionPanel";
import GameEndScreen from "./GameEndScreen";
import HandGrid from "./HandGrid";
import PlayerInfo from "./PlayerInfo";
import type { Card as CardType } from "../utils/cardUtils";

interface GameBoardProps {
  initialRoomId: string;
  initialPlayerName: string;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  initialRoomId,
  initialPlayerName,
}) => {
  const {
    setPlayerName,
    setRoomId,
    gameState,
    isPlayerTurn,
    myPlayer,
    handleDrawCard,
    handleDeclare,
    handleConfirmDeclare,
    handleDiscardDrawnCard,
    drawnCard,
    handleSelectCard,
    selectedCard,
    selectedPower,
    powerInstructions,
    handleCardClick,
    showDeclareModal,
    setShowDeclareModal,
    canDiscardDrawnCard,
    currentPlayerId,
    refreshPlayerData,
  } = useGameContext();

  // State to track the opponent we're currently viewing
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);

  // Listen for player switches and rejoin if necessary (only for mock mode)
  useEffect(() => {
    // Only handle player switching in mock mode
    if (socket.getMode() !== "mock") return;

    const handlePlayerSwitch = () => {
      console.log(`GameBoard: Player switched to ${socket.getCurrentPlayer()}`);
      refreshPlayerData();

      // If we've already joined, rejoin as the new player WITHOUT leaving first
      if (hasJoined) {
        const newPlayerName =
          socket.getCurrentPlayer() === "player1" ? "Player 1" : "Player 2";
        console.log(`Rejoining as ${newPlayerName} (without leaving)`);

        socket.emit("join-room", {
          roomId: initialRoomId,
          playerName: newPlayerName,
        });

        setPlayerName(newPlayerName);
      }
    };

    window.addEventListener("player-switched", handlePlayerSwitch);

    return () => {
      window.removeEventListener("player-switched", handlePlayerSwitch);
    };
  }, [hasJoined, initialRoomId, setPlayerName, refreshPlayerData]);

  useEffect(() => {
    // Set player name and room ID in context
    setPlayerName(initialPlayerName);
    setRoomId(initialRoomId);

    // Join the room
    console.log(
      `[${currentPlayerId}] Joining room ${initialRoomId} as ${initialPlayerName}`
    );
    
    // Ensure socket is connected before joining
    if (socket.getMode() === "real") {
      const joinRoom = () => {
        console.log(`[${currentPlayerId}] Emitting join-room:`, {
          roomId: initialRoomId,
          playerName: initialPlayerName,
        });
        socket.emit("join-room", {
          roomId: initialRoomId,
          playerName: initialPlayerName,
        });
      };

      // Set up connection listener (only once)
      let connectionListenerAdded = false;
      const setupConnectionListener = () => {
        if (connectionListenerAdded) return;
        connectionListenerAdded = true;
        
        socket.on("connect", () => {
          console.log(`[${currentPlayerId}] Socket connected, joining room now`);
          joinRoom();
        });
      };

      const socketId = socket.getId();
      if (!socketId) {
        console.warn(`[${currentPlayerId}] Socket not connected yet, waiting for connection...`);
        setupConnectionListener();
        
        // Also try after delays as fallback (Socket.io should auto-queue, but just in case)
        const retryDelays = [2000, 5000, 10000];
        retryDelays.forEach((delay) => {
          setTimeout(() => {
            const currentSocketId = socket.getId();
            if (currentSocketId) {
              console.log(`[${currentPlayerId}] Socket connected (delayed check at ${delay}ms), joining room`);
              joinRoom();
            } else {
              console.warn(`[${currentPlayerId}] Socket still not connected after ${delay}ms`);
            }
          }, delay);
        });
      } else {
        // Already connected, join immediately
        joinRoom();
      }
    } else {
      socket.emit("join-room", {
        roomId: initialRoomId,
        playerName: initialPlayerName,
      });
    }

    setHasJoined(true);

    // Don't leave room on unmount - let players stay in room when switching
    return () => {
      // Only leave if component is actually being unmounted (not just player switching)
      console.log(`GameBoard unmounting for ${currentPlayerId}`);
    };
  }, [
    initialPlayerName,
    initialRoomId,
    setPlayerName,
    setRoomId,
    currentPlayerId,
  ]);

  const handleStartGame = () => {
    console.log(`[${currentPlayerId}] Starting game in room ${initialRoomId}`);
    socket.emit("start-game", { roomId: initialRoomId });
  };

  const handlePlayAgain = () => {
    // Reset the game and restart
    console.log(
      `[${currentPlayerId}] Restarting game in room ${initialRoomId}`
    );
    socket.emit("start-game", { roomId: initialRoomId });
  };

  const handleReturnToLobby = () => {
    // Reset the game state to waiting (lobby) without starting a new game
    console.log(
      `[${currentPlayerId}] Returning to lobby in room ${initialRoomId}`
    );
    socket.emit("return-to-lobby", { roomId: initialRoomId });
  };

  // Get current player's hand from game state
  const myHand = myPlayer?.hand || [];

  // Get top card from discard pile
  const topDiscardCard = gameState?.discardPile.length
    ? gameState.discardPile[gameState.discardPile.length - 1]
    : null;

  // Check if current player is host
  const currentSocketId = socket.getId();
  const isHost =
    gameState?.players.find((p) => p.id === currentSocketId)?.isHost || false;

  console.log(
    `Host check: Current socket ID: ${currentSocketId}, Is host: ${isHost}`
  );
  console.log(
    `All players:`,
    gameState?.players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
    }))
  );

  // Check if game has started (playing or ended)
  const gameStarted = gameState?.gameStatus === "playing" || gameState?.gameStatus === "ended";

  // Check if game has ended
  const gameEnded = gameState?.gameStatus === "ended";

  // Get remaining deck size
  const deckSize = gameState?.deck.length || 0;

  // Get a random opponent for display (if any)
  const opponents =
    gameState?.players.filter((p) => p.id !== myPlayer?.id) || [];
  const opponent = selectedOpponent
    ? opponents.find((p) => p.id === selectedOpponent)
    : opponents[0] || null;

  const renderOpponentHand = () => {
    if (!opponent || !opponent.hand.length) return null;

    // Return our HandGrid component for opponent cards
    return (
      <HandGrid
        cards={opponent.hand}
        playerId={opponent.id}
        isCurrentPlayer={false}
        isPlayerTurn={false}
      />
    );
  };

  const renderMyHand = () => {
    if (!myHand.length) return null;

    // Return our HandGrid component for player cards
    return (
      <HandGrid
        cards={myHand}
        playerId={myPlayer?.id || ""}
        isCurrentPlayer={true}
        isPlayerTurn={isPlayerTurn}
        isDeclarationMode={showDeclareModal}
        onConfirmDeclaration={handleConfirmDeclare}
        onCancelDeclaration={() => setShowDeclareModal(false)}
      />
    );
  };

  const renderOpponentSelector = () => {
    if (!opponents.length) return null;

    return (
      <div className="flex justify-center mb-2">
        <select
          value={selectedOpponent || ""}
          onChange={(e) => setSelectedOpponent(e.target.value || null)}
          className="bg-gray-700 text-white px-2 py-1 rounded"
        >
          <option value="">Select Opponent</option>
          {opponents.map((op) => (
            <option
              key={op.id}
              value={op.id}
            >
              {op.name}{" "}
              {op.id === gameState?.players[gameState.currentPlayerIndex]?.id
                ? "(Turn)"
                : ""}
            </option>
          ))}
        </select>
      </div>
    );
  };

  if (!gameStarted) {
    return (
      <div className="min-h-screen p-6 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">Room: {initialRoomId}</h1>
              <h2 className="text-lg">You: {initialPlayerName}</h2>
              <div className="text-sm text-gray-400 mt-1">
                Playing as:{" "}
                {currentPlayerId === "player1" ? "Player 1" : "Player 2"}
              </div>
            </div>
            <div>
              {isHost &&
                gameState?.players &&
                gameState.players.length >= 2 && (
                  <button
                    onClick={handleStartGame}
                    className="px-6 py-3 bg-green-600 rounded-lg hover:bg-green-700 font-semibold"
                  >
                    Start Game
                  </button>
                )}
              {!isHost && (
                <div className="text-gray-400 text-sm">
                  Waiting for host to start...
                </div>
              )}
              {gameState?.players && gameState.players.length < 2 && (
                <div className="text-yellow-400 text-sm">
                  Need at least 2 players to start
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-gray-800 rounded-lg text-center">
            <h2 className="text-xl font-bold mb-2">
              {isHost
                ? "You are the host! Click 'Start Game' when ready!"
                : "Waiting for host to start the game..."}
            </h2>
            <p className="text-gray-300 mb-4">
              Players: {gameState?.players.length || 0}/8
            </p>

            {/* Host indicator */}
            {gameState?.players && gameState.players.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-yellow-400">
                  Host:{" "}
                  {gameState.players.find((p) => p.isHost)?.name || "Unknown"}
                </p>
              </div>
            )}

            {gameState?.players && gameState.players.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-3">Players in Room:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-md mx-auto">
                  {gameState.players.map((player) => (
                    <div
                      key={player.id}
                      className={`p-3 rounded-lg border ${
                        player.id === currentSocketId
                          ? "bg-blue-900 border-blue-600"
                          : "bg-gray-700 border-gray-600"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <span
                          className={`font-medium ${
                            player.isHost ? "text-yellow-400" : "text-white"
                          }`}
                        >
                          {player.name}
                          {player.isHost && " 👑"}
                          {player.id === currentSocketId && " (You)"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions for 2-player mode */}
            <div className="mt-6 p-4 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-600">
              <h3 className="text-sm font-bold text-blue-300 mb-2">
                2-Player Mode Instructions
              </h3>
              <div className="text-xs text-blue-200 space-y-1">
                <div>
                  • Use the player switcher (top right) to alternate between
                  players
                </div>
                <div>
                  • Both players join the same room with different names
                </div>
                <div>
                  • Switch perspectives when it's the other player's turn
                </div>
                <div>
                  • Current player:{" "}
                  <span className="font-bold">
                    {currentPlayerId === "player1" ? "Player 1" : "Player 2"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Debug logging for game end state
  console.log(`[${currentPlayerId}] GameBoard render - gameState:`, gameState);
  console.log(`[${currentPlayerId}] GameBoard render - gameStatus:`, gameState?.gameStatus);
  console.log(`[${currentPlayerId}] GameBoard render - gameEnded:`, gameEnded);
  
  // Force render the GameEndScreen if game status is ended, regardless of gameEnded calculation
  const forceShowEndScreen = gameState?.gameStatus === "ended";

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px",
        backgroundColor: "#fafafa",
        color: "#2a2a2a",
      }}
    >
      {/* Game End Screen - Debug */}
      {forceShowEndScreen && (
        <>
          <div
            style={{
              position: "fixed",
              top: "10px",
              left: "10px",
              background: "red",
              color: "white",
              padding: "5px",
              zIndex: 999999,
            }}
          >
            GAME ENDED - SHOWING END SCREEN (Status: {gameState?.gameStatus})
          </div>
          <GameEndScreen onPlayAgain={handlePlayAgain} onReturnToLobby={handleReturnToLobby} />
        </>
      )}


      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h4 className="text-xl font-bold">Room: {initialRoomId}</h4>
            <h5 className="text-sm text-gray-300">You: {initialPlayerName}</h5>
            <div className="text-xs text-gray-400">
              Playing as:{" "}
              {currentPlayerId === "player1" ? "Player 1" : "Player 2"}
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm">
              {isPlayerTurn
                ? "🟢 Your Turn"
                : `⏳ ${
                    gameState?.players[gameState.currentPlayerIndex]?.name
                  }'s Turn`}
            </p>
            <div className="text-xs text-gray-400 mt-1">
              Round {gameState?.roundNumber || 1}
            </div>
          </div>
        </div>

        {/* Main Game Board Layout */}
        <div className="flex flex-col gap-6 w-full">
          {/* Opponent's Cards Section */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-center mb-3 font-semibold">
              {opponent ? "Opponent" : "No Opponents"}
            </h3>
            {opponent ? (
              <>
                <div className="mb-3">
                  <PlayerInfo
                    name={opponent.name}
                    isHost={opponent.isHost}
                    isCurrentTurn={
                      gameState?.players[gameState.currentPlayerIndex]?.id ===
                      opponent.id
                    }
                    isCurrentPlayer={false}
                  />
                </div>
                {renderOpponentHand()}
              </>
            ) : (
              <div className="text-center py-8 text-gray-400">
                Waiting for another player...
              </div>
            )}
            {renderOpponentSelector()}
          </div>

          {/* Middle Section - Deck and Discard Pile */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg relative">
              <h3 className="text-center mb-3 font-semibold">Deck</h3>
              <div className="flex justify-center">
                <Deck
                  cardsRemaining={deckSize}
                  onDeckClick={
                    isPlayerTurn && 
                    !drawnCard && 
                    !myPlayer?.activePower
                      ? handleDrawCard
                      : undefined
                  }
                />
              </div>
              {isPlayerTurn && !drawnCard && !myPlayer?.activePower && (
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
              )}
              <div className="text-center mt-2 text-xs text-gray-400">
                {isPlayerTurn && !drawnCard && !myPlayer?.activePower ? (
                  "Click to draw"
                ) : myPlayer?.activePower ? (
                  `Resolve ${myPlayer.activePower} power first`
                ) : (
                  `${deckSize} cards`
                )}
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-center mb-3 font-semibold">Discard</h3>
              <div className="flex justify-center">
                <div
                  onClick={
                    drawnCard && isPlayerTurn
                      ? handleDiscardDrawnCard
                      : undefined
                  }
                  className={
                    drawnCard && isPlayerTurn
                      ? "cursor-pointer hover:scale-105 transition-transform"
                      : ""
                  }
                >
                  <DiscardPile
                    topCard={topDiscardCard}
                    count={gameState?.discardPile.length || 0}
                    onDiscardClick={
                      drawnCard && isPlayerTurn
                        ? handleDiscardDrawnCard
                        : undefined
                    }
                  />
                </div>
              </div>
              <div className="text-center mt-2 text-xs text-gray-400">
                {drawnCard && isPlayerTurn ? (
                  <span className="text-green-300">
                    Click to discard drawn card
                  </span>
                ) : topDiscardCard ? (
                  `Top: ${topDiscardCard.rank}${
                    topDiscardCard.suit === "hearts"
                      ? "♥"
                      : topDiscardCard.suit === "diamonds"
                      ? "♦"
                      : topDiscardCard.suit === "clubs"
                      ? "♣"
                      : "♠"
                  }`
                ) : (
                  "Empty"
                )}
              </div>
            </div>
          </div>

          {/* My Cards Section */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="mb-3">
              <PlayerInfo
                name={myPlayer?.name || initialPlayerName}
                isHost={isHost}
                isCurrentTurn={isPlayerTurn}
                isCurrentPlayer={true}
              />
            </div>
            {renderMyHand()}
          </div>

          {/* Drawn Card Section */}
          {drawnCard && (
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-center mb-3 font-semibold">Drawn Card</h3>
              <div className="flex justify-center">
                <Card
                  suit={drawnCard.suit}
                  rank={drawnCard.rank}
                  isRevealed={true}
                  isSelected={false}
                />
              </div>
              <div className="text-center mt-2 text-xs text-gray-400">
                Click hand card to swap • Click discard pile to discard
              </div>
              {selectedPower && (
                <div className="text-center mt-1 text-xs text-purple-300">
                  Power preview: {selectedPower} (activates when discarded)
                </div>
              )}
            </div>
          )}

          {/* Special Power Instructions */}
          {powerInstructions && (
            <div className="bg-purple-800 p-4 rounded-lg">
              <div className="flex items-center justify-center">
                <div>
                  <h3 className="text-lg font-bold text-center mb-2">
                    Special Power Active
                  </h3>
                  <p className="text-center">{powerInstructions}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Panel */}
          <div className="mt-2">
            <ActionPanel
              isPlayerTurn={isPlayerTurn}
              onDeclare={handleDeclare}
              drawnCard={drawnCard}
            />
          </div>

          {/* Current Player Turn Indicator */}
          <div className="bg-gray-700 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-gray-300">Current Turn:</span>
                <span className="ml-2 font-semibold text-white">
                  {gameState?.players[gameState.currentPlayerIndex]?.name ||
                    "Unknown"}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {isPlayerTurn && (
                  <span className="text-green-400 animate-pulse">
                    ● Your turn
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Game Status */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-gray-700 p-2 rounded text-center">
              <div className="text-gray-300">Players</div>
              <div className="font-bold">{gameState?.players.length || 0}</div>
            </div>
            <div className="bg-gray-700 p-2 rounded text-center">
              <div className="text-gray-300">Cards Left</div>
              <div className="font-bold">{deckSize}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
