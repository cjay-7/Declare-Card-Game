// client/src/components/ActionPanel.tsx - Enhanced with better King power instructions
import React from "react";
import { useGameContext } from "../contexts/GameContext";

interface ActionPanelProps {
  isPlayerTurn: boolean;
  onDeclare: () => void;
  drawnCard: any;
}

const ActionPanel: React.FC<ActionPanelProps> = ({
  isPlayerTurn,
  onDeclare,
  drawnCard,
}) => {
  const { gameState, myPlayer, swapSelections } = useGameContext();

  // Check if current player has an active power
  const currentPlayer = gameState?.players.find((p) => p.id === myPlayer?.id);
  const activePower = currentPlayer?.activePower;

  const getPowerInstructions = (power: string) => {
    switch (power) {
      case "7":
      case "8":
        return {
          title: `${power} Power: Peek at Your Own Card`,
          description: "Click on one of your own cards to secretly view it.",
          icon: "👁️",
          color: "bg-blue-600",
        };
      case "9":
      case "10":
        return {
          title: `${power} Power: Peek at Opponent's Card`,
          description:
            "Click on one of your opponent's cards to secretly view it.",
          icon: "🔍",
          color: "bg-green-600",
        };
      case "Q":
        return {
          title: "Queen Power: Unseen Swap",
          description: `Select 2 cards to swap without seeing them first. (${swapSelections.length}/2 selected)`,
          icon: "🔄",
          color: "bg-purple-600",
        };
      case "K":
        return {
          title: "King Power: Seen Swap",
          description: `Select 2 cards to swap. Both cards will be revealed to all players before swapping! (${swapSelections.length}/2 selected)`,
          icon: "👑",
          color: "bg-yellow-600",
          warning: true,
        };
      default:
        return null;
    }
  };

  if (activePower) {
    const powerInfo = getPowerInstructions(activePower);
    if (!powerInfo) return null;

    return (
      <div
        className={`p-4 rounded-lg ${powerInfo.color} border-2 border-opacity-50`}
      >
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <span className="text-2xl mr-2">{powerInfo.icon}</span>
            <h3 className="font-bold text-white text-lg">{powerInfo.title}</h3>
            <span className="text-2xl ml-2">{powerInfo.icon}</span>
          </div>

          <div className="text-sm text-white mb-3">{powerInfo.description}</div>

          {powerInfo.warning && (
            <div className="bg-red-500 bg-opacity-20 border border-red-400 rounded-lg p-2 mb-3">
              <div className="flex items-center justify-center text-red-200 text-xs">
                <span className="mr-1">⚠️</span>
                <strong>Warning:</strong> Both cards will be visible to ALL
                players!
                <span className="ml-1">⚠️</span>
              </div>
            </div>
          )}

          {["Q", "K"].includes(activePower) && swapSelections.length > 0 && (
            <div className="text-xs text-white bg-black bg-opacity-20 rounded p-2">
              Selected:{" "}
              {swapSelections.map((sel, idx) => (
                <span
                  key={idx}
                  className="inline-block mx-1 px-2 py-1 bg-white bg-opacity-20 rounded"
                >
                  {sel.playerId === myPlayer?.id ? "Your" : "Opponent's"} card{" "}
                  {sel.cardIndex + 1}
                </span>
              ))}
            </div>
          )}

          <div className="text-xs text-white text-opacity-75 mt-2">
            Click on cards to use your power
          </div>
        </div>
      </div>
    );
  }

  if (!isPlayerTurn) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg">
        <p className="text-center text-gray-400">Waiting for your turn...</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h3 className="text-center mb-2 font-semibold text-white">Your Turn</h3>

      {/* Instructions */}
      <div className="text-xs text-gray-300 text-center mb-3">
        {drawnCard
          ? "Click your cards to swap • Click discard pile to discard drawn card"
          : "Click deck to draw • Click ❌ on cards to eliminate • Declare when ready"}
      </div>

      <div className="flex justify-center space-x-3">
        <button
          onClick={onDeclare}
          className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 text-white text-sm font-medium"
          title="Declare your hand (must name all ranks)"
        >
          Declare
        </button>
      </div>

      {/* Action hints */}
      <div className="mt-2 text-xs text-center text-gray-300">
        {drawnCard ? (
          <span className="text-blue-300">
            Drawn card ready - click hand card to swap or discard pile to
            discard
          </span>
        ) : (
          <span>Draw from deck or eliminate cards by clicking ❌</span>
        )}
      </div>

      {/* Game rules reminder */}
      <div className="mt-3 text-xs text-gray-400 text-center">
        <div className="bg-gray-700 rounded p-2">
          <div className="font-medium mb-1">Quick Tips:</div>
          <div>• K♥/♦ = 0 points, K♠/♣ = 13 points</div>
          <div>• Goal: Lowest total points wins</div>
          <div>• Card powers activate when discarded</div>
        </div>
      </div>
    </div>
  );
};

export default ActionPanel;
