// Enhanced ActionPanel.tsx - Clear separation of Turn Actions vs Elimination Actions

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

  // Check elimination eligibility
  const canEliminate =
    gameState?.discardPile && gameState.discardPile.length > 0;
  const hasAlreadyEliminated = currentPlayer?.hasEliminatedThisRound || false;

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

  // If player has an active power, show power UI
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

  // Main action panel
  return (
    <div className="space-y-4">
      {/* Turn-Based Actions Section */}
      <div className="p-4 bg-gray-800 rounded-lg border-l-4 border-blue-500">
        <div className="flex items-center mb-2">
          <span className="text-blue-400 mr-2">🎯</span>
          <h3 className="font-semibold text-white">Turn Actions</h3>
          {isPlayerTurn && (
            <span className="ml-2 text-green-400 text-sm animate-pulse">
              ● Your Turn
            </span>
          )}
        </div>

        {isPlayerTurn ? (
          <div className="space-y-3">
            {drawnCard ? (
              <div className="text-center">
                <div className="text-sm text-gray-300 mb-2">
                  You drew a card! Choose what to do:
                </div>
                <div className="text-xs text-blue-300">
                  • Click hand card to swap with drawn card
                  <br />• Click discard pile to discard drawn card
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-center">
                  <div className="text-sm text-gray-300 mb-2">
                    Choose your turn action:
                  </div>
                  <div className="text-xs text-gray-400">
                    • Click deck to draw a card
                    <br />• Click "Declare" if you think you have the lowest
                    total
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={onDeclare}
                    className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 text-white text-sm font-medium"
                    title="Declare your hand (must name all remaining card ranks)"
                  >
                    🎯 Declare Hand
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <div className="text-sm">Waiting for your turn...</div>
            <div className="text-xs mt-1">
              Current turn:{" "}
              {gameState?.players[gameState.currentPlayerIndex]?.name ||
                "Unknown"}
            </div>
          </div>
        )}
      </div>

      {/* Elimination Actions Section - Always Available */}
      <div className="p-4 bg-gray-800 rounded-lg border-l-4 border-red-500">
        <div className="flex items-center mb-2">
          <span className="text-red-400 mr-2">⚡</span>
          <h3 className="font-semibold text-white">Elimination Actions</h3>
          <span className="ml-2 text-yellow-400 text-sm">Always Available</span>
        </div>

        <div className="space-y-2">
          {canEliminate ? (
            <div className="text-center">
              {hasAlreadyEliminated ? (
                <div className="text-yellow-400 text-sm">
                  ⏳ You already eliminated a card this round.
                  <br />
                  Wait for someone else to discard to eliminate again.
                </div>
              ) : (
                <div>
                  <div className="text-sm text-gray-300 mb-1">
                    Elimination available! Click ❌ on matching cards.
                  </div>
                  <div className="text-xs text-green-300">
                    Match the top discard card rank to eliminate it for 0
                    points!
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-400 text-sm">
              No cards in discard pile yet.
              <br />
              Elimination becomes available after first discard.
            </div>
          )}

          {/* Elimination Rules */}
          <div className="text-xs text-gray-400 bg-gray-700 rounded p-2">
            <div className="font-medium mb-1">Elimination Rules:</div>
            <div>• Match rank of top discard card</div>
            <div>• Only 1 card per round per player</div>
            <div>• Wrong guess = penalty card</div>
            <div>• Eliminated cards = 0 points</div>
          </div>
        </div>
      </div>

      {/* Game Status Section */}
      <div className="p-3 bg-gray-700 rounded-lg">
        <div className="text-xs text-gray-300 space-y-1">
          <div className="flex justify-between">
            <span>Cards in deck:</span>
            <span className="text-white">{gameState?.deck.length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Cards in discard:</span>
            <span className="text-white">
              {gameState?.discardPile.length || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Round:</span>
            <span className="text-white">{gameState?.roundNumber || 1}</span>
          </div>
        </div>

        {/* Quick reminder */}
        <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400 text-center">
          <div className="font-medium mb-1">Remember:</div>
          <div>K♥/♦ = 0 pts • K♠/♣ = 13 pts • Goal: Lowest total wins</div>
        </div>
      </div>
    </div>
  );
};

export default ActionPanel;
