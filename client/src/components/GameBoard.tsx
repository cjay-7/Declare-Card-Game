// client/src/components/GameBoard.tsx
import React, { useEffect } from "react";
import socket from "../socket";
import PlayersList from "./PlayerList";
import Hand from "./Hand";
import Deck from "./Deck";
import DiscardPile from "./DiscardPile";
import ActionPanel from "./ActionPanel";
import { useGameContext } from "../contexts/GameContext";
import Player from "./Player";
import type { Card } from "../utils/cardUtils";

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
  } = useGameContext();

  useEffect(() => {
    setPlayerName(initialPlayerName);
    setRoomId(initialRoomId);

    // Join the room
    socket.emit("join-room", {
      roomId: initialRoomId,
      playerName: initialPlayerName,
    });

    // Cleanup on unmount
    return () => {
      socket.emit("leave-room", { roomId: initialRoomId, playerId: socket.id });
    };
  }, [initialPlayerName, initialRoomId, setPlayerName, setRoomId]);

  const handleStartGame = () => {
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
    gameState?.players.find((p) => p.id === socket.id)?.isHost || false;

  // Check if game has started
  const gameStarted = gameState?.gameStatus === "playing";

  // Get remaining deck size
  const deckSize = gameState?.deck.length || 0;

  function handleSelectCard(drawnCard: Card): void {
    throw new Error("Function not implemented.");
  }

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Room: {initialRoomId}</h1>
            <h2 className="text-lg">You: {initialPlayerName}</h2>
          </div>
          <div>
            {isHost && !gameStarted && (
              <button
                onClick={handleStartGame}
                className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
                //disabled={gameState?.players.length < 2}
              >
                Start Game
                {/* {gameState?.players.length < 2 && " (Need at least 2 players)"} */}
              </button>
            )}
          </div>
        </div>

        {gameState?.players && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {gameState.players.map((player) => (
              <Player
                key={player.id}
                id={player.id}
                name={player.name}
                isHost={player.isHost}
                isCurrentTurn={
                  gameState.players[gameState.currentPlayerIndex]?.id ===
                  player.id
                }
                score={player.score}
                isCurrentPlayer={player.id === myPlayer?.id}
                cardCount={player.hand.length}
              />
            ))}
          </div>
        )}

        {gameStarted ? (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Game Board</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-center mb-2">Deck</h3>
                <div className="flex justify-center">
                  <Deck
                    cardsRemaining={deckSize}
                    onDeckClick={isPlayerTurn ? handleDrawCard : undefined}
                  />
                </div>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-center mb-2">Discard Pile</h3>
                <div className="flex justify-center">
                  <DiscardPile
                    topCard={topDiscardCard}
                    count={gameState?.discardPile.length || 0}
                  />
                </div>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-center mb-2">Your Hand</h3>
                <Hand
                  cards={myHand}
                  playerId={myPlayer?.id || ""}
                  isCurrentPlayer={true}
                />
              </div>
            </div>

            {/* Show drawn card if present */}
            {drawnCard && (
              <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                <h3 className="text-center mb-2">Drawn Card</h3>
                <div className="flex justify-center">
                  <div onClick={() => handleSelectCard(drawnCard)}>
                    {/* <Card 
                      suit={drawnCard.suit}
                      rank={drawnCard.rank}
                      isRevealed={true}
                      isSelected={selectedCard?.cardId === drawnCard.id}
                    /> */}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6">
              <ActionPanel
                isPlayerTurn={isPlayerTurn}
                onDraw={handleDrawCard}
                onSwap={handleSwapCard}
                onDiscard={handleDiscardCard}
                onDeclare={handleDeclare}
              />
            </div>
          </div>
        ) : (
          <div className="mt-8 p-6 bg-gray-800 rounded-lg text-center">
            <h2 className="text-xl font-bold mb-2">
              Waiting for host to start the game...
            </h2>
            <p>Players: {gameState?.players.length || 0}/8</p>
          </div>
        )}
      </div>
    </div>
  );
};
