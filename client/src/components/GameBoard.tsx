// client/src/components/GameBoard.tsx
import React, { useEffect, useState } from "react";
import socket from "../socket";
import { useGameContext } from "../contexts/GameContext";
import Card from "./Card";
import Deck from "./Deck";
import DiscardPile from "./DiscardPile";
import ActionPanel from "./ActionPanel";
import GameEndScreen from "./GameEndScreen";
import ViewBottomCardsButton from "./ViewBottomCardsButton";
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
    handleSwapCard,
    handleDiscardCard,
    handleDeclare,
    drawnCard,
    handleSelectCard,
    selectedCard,
    hasDrawnFirstCard,
    selectedPower,
    powerInstructions,
    handleCardClick,
  } = useGameContext();

  // State to track the opponent we're currently viewing
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null);

  useEffect(() => {
    // Set player name and room ID in context
    setPlayerName(initialPlayerName);
    setRoomId(initialRoomId);

    // Join the room
    console.log(`Joining room ${initialRoomId} as ${initialPlayerName}`);
    socket.emit("join-room", {
      roomId: initialRoomId,
      playerName: initialPlayerName,
    });

    // Cleanup on unmount
    return () => {
      socket.emit("leave-room", {
        roomId: initialRoomId,
        playerId: socket.getId(),
      });
    };
  }, [initialPlayerName, initialRoomId, setPlayerName, setRoomId]);

  const handleStartGame = () => {
    console.log(`Starting game in room ${initialRoomId}`);
    socket.emit("start-game", { roomId: initialRoomId });
  };

  const handlePlayAgain = () => {
    // Reset the game and restart
    console.log(`Restarting game in room ${initialRoomId}`);
    socket.emit("start-game", { roomId: initialRoomId });
  };

  // Get current player's hand from game state
  const myHand = myPlayer?.hand || [];

  // Get top card from discard pile
  const topDiscardCard = gameState?.discardPile.length
    ? gameState.discardPile[gameState.discardPile.length - 1]
    : null;

  // Check if current player is host
  const isHost =
    gameState?.players.find((p) => p.id === socket.getId())?.isHost || false;

  // Check if game has started
  const gameStarted = gameState?.gameStatus === "playing";

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
        <div className="flex max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Room: {initialRoomId}</h1>
              <h2 className="text-lg">You: {initialPlayerName}</h2>
            </div>
            <div>
              {isHost && (
                <button
                  onClick={handleStartGame}
                  className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
                >
                  Start Game
                </button>
              )}
            </div>
          </div>

          <div className="mt-8 p-6 bg-gray-800 rounded-lg text-center">
            <h2 className="text-xl font-bold mb-2">
              Waiting for host to start the game...
            </h2>
            <p>Players: {gameState?.players.length || 0}/8</p>

            {gameState?.players && gameState.players.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Players in Room:</h3>
                <ul className="space-y-1">
                  {gameState.players.map((player) => (
                    <li
                      key={player.id}
                      className="flex justify-center items-center gap-2"
                    >
                      <span
                        className={
                          player.isHost ? "text-yellow-400" : "text-white"
                        }
                      >
                        {player.name} {player.isHost && "👑"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-white">
      {/* Game End Screen */}
      {gameEnded && <GameEndScreen onPlayAgain={handlePlayAgain} />}

      <div className="flex max-w-md mx-auto">
        <div className=" absolute top-0 left-0 mb-6">
          <div>
            <h4 className="text-xl font-bold">Room: {initialRoomId}</h4>
            <h5 className="text-sm">You: {initialPlayerName}</h5>
          </div>

          <div>
            <p className="text-sm">
              {isPlayerTurn
                ? "Your Turn"
                : `${
                    gameState?.players[gameState.currentPlayerIndex]?.name
                  }'s Turn`}
            </p>
          </div>
        </div>

        {/* Main Game Board Layout */}
        <div className="flex flex-col gap-6 w-full">
          {/* Opponent's Cards Section */}
          <div className="bg-gray-800 p-4 w-1/2 mx-auto  rounded-lg">
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
              <div className="text-center py-4 text-gray-400">
                No opponent selected
              </div>
            )}
            {renderOpponentSelector()}
          </div>

          {/* Middle Section - Deck and Discard Pile */}
          <div className="flex justify-between gap-4">
            <div className="bg-gray-800 p-4 rounded-lg flex-1 relative">
              <h3 className="text-center mb-2">Deck</h3>
              <div className="flex justify-center">
                <Deck
                  cardsRemaining={deckSize}
                  onDeckClick={isPlayerTurn ? handleDrawCard : undefined}
                />
              </div>
              {isPlayerTurn && (
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full animate-pulse"></div>
              )}
            </div>

            <div className="bg-gray-800 p-4 rounded-lg flex-1">
              <h3 className="text-center mb-2">Discard</h3>
              <div className="flex justify-center">
                <DiscardPile
                  topCard={topDiscardCard}
                  count={gameState?.discardPile.length || 0}
                  onDiscardClick={undefined}
                />
              </div>
            </div>
          </div>

          {/* My Cards Section */}
          <div className="bg-gray-800 p-4 w-1/2 mx-auto rounded-lg">
            <div className="mb-3">
              <PlayerInfo
                name={myPlayer?.name || initialPlayerName}
                isHost={isHost}
                isCurrentTurn={isPlayerTurn}
                isCurrentPlayer={true}
              />
            </div>
            {renderMyHand()}

            {/* View Bottom Cards button - only visible before first draw */}
            {!hasDrawnFirstCard && (
              <div className="mt-4 flex justify-center">
                <ViewBottomCardsButton />
              </div>
            )}
          </div>

          {/* Drawn Card Section */}
          {drawnCard && (
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-center mb-2">Drawn Card</h3>
              <div className="flex justify-center">
                <div onClick={() => handleSelectCard(drawnCard)}>
                  <Card
                    suit={drawnCard.suit}
                    rank={drawnCard.rank}
                    isRevealed={true}
                    isSelected={selectedCard?.cardId === drawnCard.id}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Special Power Instructions */}
          {powerInstructions && (
            <div className="bg-purple-800 p-4 rounded-lg">
              <div className="flex items-center justify-center">
                <div>
                  <h3 className="text-lg font-bold text-center">
                    Special Power
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
              onDraw={handleDrawCard}
              onSwap={handleSwapCard}
              onDiscard={handleDiscardCard}
              onDeclare={handleDeclare}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
