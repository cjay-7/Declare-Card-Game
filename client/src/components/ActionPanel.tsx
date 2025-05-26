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
  const { gameState, myPlayer } = useGameContext();

  // Check if current player has an active power
  const currentPlayer = gameState?.players.find((p) => p.id === myPlayer?.id);
  const activePower = currentPlayer?.activePower;

  const getPowerInstructions = (power: string) => {
    switch (power) {
      case "7":
      case "8":
        return "Click on one of your own cards to peek at it";
      case "9":
      case "10":
        return "Click on an opponent's card to peek at it";
      case "Q":
        return "Select two cards to swap them (unseen swap)";
      case "K":
        return "Select two cards to swap them (seen swap)";
      default:
        return "";
    }
  };

  if (activePower) {
    return (
      <div className="p-4 bg-purple-800 rounded-lg">
        <h3 className="text-center mb-2 font-semibold text-white">
          {activePower} Power Active!
        </h3>
        <div className="text-sm text-purple-100 text-center mb-3">
          {getPowerInstructions(activePower)}
        </div>
        <div className="text-xs text-center text-purple-200">
          Use your power by clicking on cards
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

      <div className="flex justify-center">
        <button
          onClick={onDeclare}
          className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 text-white text-sm"
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
    </div>
  );
};

export default ActionPanel;
