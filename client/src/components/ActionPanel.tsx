/* eslint-disable @typescript-eslint/no-explicit-any */
// Enhanced ActionPanel.tsx - Clear separation of Turn Actions vs Elimination Actions

import React from "react";
import { useGameContext } from "../contexts/GameContext";
import { getActiveCardCount } from "../utils/gameLogic";

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
  const { gameState, myPlayer, swapSelections, handleActivatePower, handleSkipPower } = useGameContext();

  // Check if current player has an active power
  const currentPlayer = gameState?.players.find((p) => p.id === myPlayer?.id);
  const activePower = currentPlayer?.activePower;
  const usingPower = currentPlayer?.usingPower;

  // Check elimination eligibility - only one elimination per round total
  const canEliminate =
    gameState?.discardPile && 
    gameState.discardPile.length > 0 && 
    !gameState?.eliminationUsedThisRound; // Check if ANY player has eliminated this round
  const hasAlreadyEliminated = gameState?.eliminationUsedThisRound || false;

  // Check if player can declare (must have at least 1 non-eliminated card)
  const canDeclare = currentPlayer ? getActiveCardCount(currentPlayer) > 0 : false;

  const getPowerChoiceInstructions = (power: string) => {
    switch (power) {
      case "7":
      case "8":
        return {
          title: `${power} Power Available`,
          description: "Peek at one of your own cards to secretly view it.",
          icon: "👁️",
          color: "bg-blue-600",
        };
      case "9":
      case "10":
        return {
          title: `${power} Power Available`,
          description: "Peek at one of your opponent's cards to secretly view it.",
          icon: "🔍",
          color: "bg-green-600",
        };
      case "Q":
        return {
          title: "Queen Power Available",
          description: "Swap any two cards without seeing them first (unseen swap).",
          icon: "♠️",
          color: "bg-purple-600",
        };
      case "K":
        return {
          title: "King Power Available",
          description: "Swap any two cards (both cards will be revealed to all players first).",
          icon: "👑",
          color: "bg-yellow-600",
          warning: true,
        };
      default:
        return null;
    }
  };

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

  // Helper function to render power choice section
  const renderPowerChoiceSection = () => {
    if (!activePower || usingPower) return null;
    
    const powerInfo = getPowerChoiceInstructions(activePower);
    if (!powerInfo) return null;

    return (
      <div className="p-4 bg-gray-800 rounded-lg border-l-4 border-purple-500">
        <div className="flex items-center mb-2">
          <span className="text-purple-400 mr-2">{powerInfo.icon}</span>
          <h3 className="font-semibold text-white">Power Available</h3>
          <span className="ml-2 text-purple-400 text-sm">Optional Choice</span>
        </div>

        <div className="text-center">
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

          <div className="flex space-x-3 justify-center mt-4">
            <button
              onClick={() => handleActivatePower(activePower)}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 text-sm shadow-lg"
              style={{
                minHeight: "44px",
              }}
            >
              ⚡ Use {activePower} Power
            </button>
            <button
              onClick={() => handleSkipPower(activePower)}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 text-sm shadow-lg"
              style={{
                minHeight: "44px",
              }}
            >
              ❌ Skip
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Show power usage UI when player is actively using their power
  if (activePower && usingPower) {
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
                  {sel.playerId === myPlayer?.id ? "Your" : "Opponent's"} card
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
    <div className="space-y-3">
      {/* Show mutually exclusive choice warning when both power and elimination are available */}
      {activePower && !usingPower && canEliminate && !hasAlreadyEliminated && (
        <div className="p-2 bg-yellow-900 bg-opacity-70 border-2 border-yellow-500 rounded-lg">
          <div className="flex items-center justify-center text-yellow-200 text-xs font-semibold">
            <span className="mr-2">⚠️</span>
            Choose one: Use {activePower} power OR eliminate
            <span className="ml-2">⚠️</span>
          </div>
        </div>
      )}

      {/* Power Choice Section - when power available but not using */}
      {renderPowerChoiceSection()}

      {/* Turn-Based Actions Section - Gaming Style */}
      <div className="bg-gray-800 rounded-xl border-2 border-gray-600 shadow-xl p-3">
        {isPlayerTurn ? (
          <div className="space-y-3">
            {drawnCard ? (
              <div className="text-center space-y-2">
                <div className="text-sm font-semibold text-white">
                  Card Drawn! Choose action:
                </div>
                <div className="text-xs text-gray-300">
                  Swipe right to discard • Click hand card to swap
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-center">
                  <div className="text-sm font-semibold text-white mb-2">
                    Your Turn
                  </div>
                </div>

                {canDeclare ? (
                  <button
                    onClick={onDeclare}
                    className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-lg text-white font-bold text-base shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
                    title="Declare your hand (must name all remaining card ranks)"
                    style={{
                      minHeight: "44px",
                    }}
                  >
                    🎯 DECLARE HAND
                  </button>
                ) : (
                  <div className="w-full px-6 py-4 bg-gray-600 rounded-lg text-white text-sm font-medium opacity-50 cursor-not-allowed text-center">
                    🎯 Declare Hand
                    <div className="text-xs mt-1 text-gray-400">
                      (Need at least 1 card)
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-2">
            <div className="text-sm text-gray-400 font-semibold">Waiting for your turn...</div>
            <div className="text-xs text-gray-500 mt-1">
              {gameState?.players[gameState.currentPlayerIndex]?.name || "Unknown"}'s turn
            </div>
          </div>
        )}
      </div>

      {/* Elimination Actions Section - Compact */}
      {!(activePower && usingPower) && (
        <div className="bg-gray-800 rounded-xl border-2 border-red-500 shadow-xl p-3">
          <div className="flex items-center justify-center mb-2">
            <span className="text-red-400 mr-2 text-lg">⚡</span>
            <h3 className="font-bold text-white text-sm">Elimination</h3>
          </div>

          <div className="space-y-2">
            {canEliminate ? (
              <div className="text-center">
                {hasAlreadyEliminated ? (
                  <div className="text-yellow-400 text-xs">
                    ⏳ Elimination used this round
                  </div>
                ) : (
                  <div className="text-xs text-gray-300">
                    Click ❌ on matching cards
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-400 text-xs">
                Available after first discard
              </div>
            )}
          </div>
        </div>
      )}

      {/* Game Status - Compact */}
      <div className="bg-gray-700 rounded-lg p-2">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="text-gray-400">Deck</div>
            <div className="text-white font-bold">{gameState?.deck.length || 0}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400">Discard</div>
            <div className="text-white font-bold">{gameState?.discardPile.length || 0}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400">Round</div>
            <div className="text-white font-bold">{gameState?.roundNumber || 1}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionPanel;
