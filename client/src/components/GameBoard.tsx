// components/GameBoard.tsx - FINAL PROPER LAYOUT THAT ACTUALLY WORKS
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
import DeclareModal from "./DeclareModal";
import type { Card as CardType } from "../utils/cardUtils";

interface GameBoardProps {
  initialRoomId: string;
  initialPlayerName: string;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  initialRoomId,
  initialPlayerName,
}) => {
  // Get what's available from GameContext with safe fallbacks
  const gameContext = useGameContext();

  // Safely destructure what exists
  const {
    setPlayerName,
    setRoomId,
    gameState,
    myPlayer,
    drawnCard,
    setDrawnCard,
    showDeclareModal,
    setShowDeclareModal,
  } = gameContext;

  // Local state
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const currentPlayerId = socket.getCurrentPlayer();

  // Check game state
  const isPlayerTurn =
    gameState?.players?.[gameState.currentPlayerIndex]?.id === currentPlayerId;
  const gameStarted = gameState?.gameStatus === "playing";
  const gameEnded = gameState?.gameStatus === "ended";

  // Listen for player switches
  useEffect(() => {
    const handlePlayerSwitch = () => {
      console.log(`GameBoard: Player switched to ${socket.getCurrentPlayer()}`);

      if (hasJoined) {
        const newPlayerName =
          socket.getCurrentPlayer() === "player1" ? "Player 1" : "Player 2";
        console.log(`Rejoining as ${newPlayerName} (without leaving)`);

        socket.emit("join-room", {
          roomId: initialRoomId,
          playerName: newPlayerName,
        });

        if (setPlayerName) {
          setPlayerName(newPlayerName);
        }
      }
    };

    window.addEventListener("player-switched", handlePlayerSwitch);
    return () =>
      window.removeEventListener("player-switched", handlePlayerSwitch);
  }, [hasJoined, initialRoomId, setPlayerName]);

  // Join room on mount
  useEffect(() => {
    if (setPlayerName) setPlayerName(initialPlayerName);
    if (setRoomId) setRoomId(initialRoomId);

    console.log(
      `[${currentPlayerId}] Joining room ${initialRoomId} as ${initialPlayerName}`
    );
    socket.emit("join-room", {
      roomId: initialRoomId,
      playerName: initialPlayerName,
    });

    setHasJoined(true);

    return () => {
      console.log(`GameBoard unmounting for ${currentPlayerId}`);
    };
  }, [
    initialPlayerName,
    initialRoomId,
    setPlayerName,
    setRoomId,
    currentPlayerId,
  ]);

  // Game action handlers
  const handleStartGame = () => {
    console.log(`[${currentPlayerId}] Starting game in room ${initialRoomId}`);
    socket.emit("start-game", { roomId: initialRoomId });
  };

  const handleDrawCard = () => {
    if (!isPlayerTurn || !myPlayer) {
      console.log(
        `[${currentPlayerId}] Cannot draw card - not your turn or missing data`
      );
      return;
    }

    console.log(`[${currentPlayerId}] Drawing card...`);
    socket.emit("draw-card", { roomId: initialRoomId, playerId: myPlayer.id });
  };

  const handleDeclare = () => {
    if (setShowDeclareModal) {
      setShowDeclareModal(true);
    }
  };

  const handleConfirmDeclare = (declaredRanks: string[]) => {
    if (!myPlayer) return;

    console.log(`[${currentPlayerId}] Declaring with ranks:`, declaredRanks);
    socket.emit("declare", {
      roomId: initialRoomId,
      playerId: myPlayer.id,
      declaredRanks,
    });

    if (setShowDeclareModal) {
      setShowDeclareModal(false);
    }
  };

  const handleDiscardDrawnCard = () => {
    if (!drawnCard || !myPlayer) return;

    console.log(`[${currentPlayerId}] Discarding drawn card:`, drawnCard);
    socket.emit("discard-drawn-card", {
      roomId: initialRoomId,
      playerId: myPlayer.id,
      cardId: drawnCard.id,
    });

    if (setDrawnCard) {
      setDrawnCard(null);
    }
  };

  const handlePlayAgain = () => {
    console.log(
      `[${currentPlayerId}] Restarting game in room ${initialRoomId}`
    );
    socket.emit("start-game", { roomId: initialRoomId });
  };

  // Get game data
  const myHand = myPlayer?.hand || [];
  const topDiscardCard = gameState?.discardPile?.length
    ? gameState.discardPile[gameState.discardPile.length - 1]
    : null;
  const currentSocketId = socket.getId();
  const isHost =
    gameState?.players.find((p) => p.id === currentSocketId)?.isHost || false;
  const deckSize = gameState?.deck.length || 0;
  const opponents =
    gameState?.players.filter((p) => p.id !== myPlayer?.id) || [];
  const opponent = selectedOpponent
    ? opponents.find((p) => p.id === selectedOpponent)
    : opponents[0];

  // Loading state
  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="text-xl mb-4">Loading game...</div>
          <div className="text-sm text-gray-400">Room: {initialRoomId}</div>
          <div className="text-sm text-gray-400">
            Player: {initialPlayerName}
          </div>
        </div>
      </div>
    );
  }

  // Game ended state
  if (gameEnded) {
    return (
      <GameEndScreen
        gameState={gameState}
        myPlayer={myPlayer}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">🎴 Declare</h1>
          <div className="text-gray-300 text-sm">
            Room: {initialRoomId} | You: {initialPlayerName} |
            {gameStarted
              ? ` Round ${gameState.roundNumber}`
              : " Waiting to start"}
          </div>
        </div>

        {/* PRE-GAME LOBBY */}
        {!gameStarted && (
          <div className="text-center mb-8">
            <div className="bg-gray-700 rounded-lg p-6 mb-4 max-w-md mx-auto">
              <h2 className="text-xl font-bold text-white mb-4">Game Lobby</h2>
              <div className="text-gray-300 mb-4">
                Players: {gameState.players.length}/2
              </div>

              <div className="space-y-2 mb-4">
                {gameState.players.map((player) => (
                  <div
                    key={player.id}
                    className="flex justify-between items-center bg-gray-600 rounded p-2"
                  >
                    <span className="text-white">{player.name}</span>
                    <span className="text-gray-400 text-sm">
                      {player.isHost ? "Host" : "Player"}
                      {player.id === currentSocketId ? " (You)" : ""}
                    </span>
                  </div>
                ))}
              </div>

              {isHost && gameState.players.length >= 2 && (
                <button
                  onClick={handleStartGame}
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Start Game
                </button>
              )}

              {!isHost && (
                <div className="text-gray-400 text-sm">
                  Waiting for host to start the game...
                </div>
              )}
            </div>
          </div>
        )}

        {/* MAIN GAME LAYOUT - 3 COLUMNS */}
        {gameStarted && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* LEFT COLUMN - OPPONENT */}
            <div className="space-y-4">
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-center text-white font-bold text-lg mb-4">
                  Opponent
                </h3>

                {opponent ? (
                  <>
                    <PlayerInfo
                      player={opponent}
                      isCurrentPlayer={false}
                      isPlayerTurn={
                        gameState.currentPlayerIndex ===
                        gameState.players.findIndex((p) => p.id === opponent.id)
                      }
                    />
                    <div className="mt-6">
                      <HandGrid
                        cards={opponent.hand}
                        playerId={opponent.id}
                        isCurrentPlayer={false}
                        isPlayerTurn={false}
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    Waiting for opponent...
                  </div>
                )}

                {/* Opponent selector if multiple */}
                {opponents.length > 1 && (
                  <div className="mt-4">
                    <label className="block text-gray-300 text-sm mb-2">
                      Viewing:
                    </label>
                    <select
                      value={selectedOpponent || opponents[0]?.id || ""}
                      onChange={(e) => setSelectedOpponent(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-600 text-white rounded"
                    >
                      {opponents.map((opp) => (
                        <option
                          key={opp.id}
                          value={opp.id}
                        >
                          {opp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* CENTER COLUMN - GAME AREA */}
            <div className="space-y-6">
              {/* Deck and Discard Area */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-center text-white font-bold text-lg mb-6">
                  Game Area
                </h3>

                <div className="flex justify-center items-center space-x-12">
                  {/* Deck */}
                  <div className="text-center">
                    <div className="mb-2">
                      <Deck
                        cardCount={deckSize}
                        onDrawCard={handleDrawCard}
                        canDraw={isPlayerTurn && !drawnCard}
                      />
                    </div>
                    <div className="text-xs text-gray-300">
                      {isPlayerTurn && !drawnCard
                        ? "Click to draw"
                        : `${deckSize} cards`}
                    </div>
                  </div>

                  {/* Discard Pile */}
                  <div className="text-center">
                    <div className="mb-2">
                      <DiscardPile
                        topCard={topDiscardCard}
                        cardCount={gameState.discardPile.length}
                        onDiscardClick={
                          drawnCard && isPlayerTurn
                            ? handleDiscardDrawnCard
                            : undefined
                        }
                      />
                    </div>
                    <div className="text-xs text-gray-300">
                      {drawnCard && isPlayerTurn
                        ? "Click to discard"
                        : "Discard pile"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawn Card */}
              {drawnCard && (
                <div className="bg-gray-700 rounded-lg p-6">
                  <h3 className="text-center text-white font-bold mb-4">
                    You Drew
                  </h3>
                  <div className="flex justify-center">
                    <Card
                      card={drawnCard}
                      isRevealed={true}
                      onClick={handleDiscardDrawnCard}
                      className="cursor-pointer hover:ring-2 hover:ring-red-400 transition-all"
                    />
                  </div>
                  <div className="text-center mt-4 text-gray-300 text-sm">
                    Click to discard, or click your cards to swap
                  </div>
                </div>
              )}

              {/* Turn Indicator */}
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-center">
                  {isPlayerTurn ? (
                    <div className="text-green-400 font-bold text-lg">
                      🎯 Your Turn
                    </div>
                  ) : (
                    <div className="text-gray-300">
                      Waiting for{" "}
                      {gameState.players[gameState.currentPlayerIndex]?.name}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - YOUR CARDS & ACTIONS */}
            <div className="space-y-4">
              {/* Your Cards */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-center text-white font-bold text-lg mb-4">
                  Your Cards
                </h3>

                {myPlayer && (
                  <>
                    <PlayerInfo
                      player={myPlayer}
                      isCurrentPlayer={true}
                      isPlayerTurn={isPlayerTurn}
                    />
                    <div className="mt-6">
                      <HandGrid
                        cards={myHand}
                        playerId={myPlayer.id}
                        isCurrentPlayer={true}
                        isPlayerTurn={isPlayerTurn}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Action Panel */}
              <ActionPanel
                isPlayerTurn={isPlayerTurn}
                onDeclare={handleDeclare}
                drawnCard={drawnCard}
              />
            </div>
          </div>
        )}

        {/* Declare Modal */}
        {showDeclareModal && (
          <DeclareModal
            isOpen={showDeclareModal}
            onClose={() => setShowDeclareModal && setShowDeclareModal(false)}
            onConfirm={handleConfirmDeclare}
          />
        )}
      </div>
    </div>
  );
};

export default GameBoard;
