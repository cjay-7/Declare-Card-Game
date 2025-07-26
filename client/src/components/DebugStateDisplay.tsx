// client/src/components/DebugStateDisplay.tsx
import React from "react";
import { useGameContext } from "../contexts/GameContext";

const DebugStateDisplay: React.FC = () => {
  const {
    drawnCard,
    selectedCard,
    gameState,
    myPlayer,
    isPlayerTurn,
    selectedPower,
    powerInstructions,
    currentPlayerId,
  } = useGameContext();

  // Only show in development mode
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h3 className="font-bold text-yellow-400 mb-2">DEBUG STATE</h3>

      <div className="space-y-1">
        <div className="text-green-400">
          <strong>Player ID:</strong> {currentPlayerId}
        </div>

        <div className="text-blue-400">
          <strong>Is My Turn:</strong> {isPlayerTurn ? "YES" : "NO"}
        </div>

        <div className="text-purple-400">
          <strong>Drawn Card:</strong>{" "}
          {drawnCard
            ? `${drawnCard.rank} of ${drawnCard.suit} (ID: ${drawnCard.id})`
            : "NONE"}
        </div>

        <div className="text-orange-400">
          <strong>Selected Card:</strong>{" "}
          {selectedCard ? `ID: ${selectedCard.cardId}` : "NONE"}
        </div>

        <div className="text-red-400">
          <strong>Active Power:</strong> {selectedPower || "NONE"}
        </div>

        <div className="text-cyan-400">
          <strong>Power Instructions:</strong> {powerInstructions || "NONE"}
        </div>

        <div className="text-gray-400">
          <strong>My Hand:</strong> {myPlayer?.hand?.length || 0} cards
        </div>

        <div className="text-gray-400">
          <strong>Game Status:</strong> {gameState?.gameStatus || "unknown"}
        </div>

        {drawnCard && (
          <div className="mt-2 p-2 bg-green-900 rounded">
            <div className="text-green-300 font-bold">✅ READY TO REPLACE!</div>
            <div className="text-xs">
              Click any hand card to replace with {drawnCard.rank}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugStateDisplay;
