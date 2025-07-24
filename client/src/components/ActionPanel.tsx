/* eslint-disable @typescript-eslint/no-explicit-any */
// Enhanced ActionPanel.tsx - Clear separation with Power Activation

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
  const {
    gameState,
    myPlayer,
    swapSelections,
    pendingPowerActivation,
    handleActivatePower,
    handleSkipPowerActivation,
    selectedPower,
    handleDrawCard,
    handleDiscardDrawnCard,
  } = useGameContext();

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

  // NEW: Show power activation options when there's a pending power
  if (
    pendingPowerActivation &&
    pendingPowerActivation.playerId === myPlayer?.id
  ) {
    const powerInfo = getPowerInstructions(pendingPowerActivation.cardRank);
    if (!powerInfo) return null;

    return (
      <div className="space-y-4">
        {/* PRIORITY 1: Power Activation Decision */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 border-2 border-purple-400">
          <div className="text-center">
            <div className="flex items-center justify-center mb-3">
              <span className="text-2xl mr-2">{powerInfo.icon}</span>
              <h3 className="font-bold text-white text-lg">
                {pendingPowerActivation.cardRank} Power Available
              </h3>
              <span className="text-2xl ml-2">{powerInfo.icon}</span>
            </div>

            <div className="text-sm text-white mb-4">
              You discarded a {pendingPowerActivation.cardRank}. Do you want to
              activate its power?
            </div>

            <div className="text-xs text-gray-200 mb-4 bg-black bg-opacity-20 rounded p-2">
              <strong>Power Effect:</strong> {powerInfo.description}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleActivatePower}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                ⚡ Activate Power
              </button>
              <button
                onClick={handleSkipPowerActivation}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                ❌ Skip Power
              </button>
            </div>

            <div className="text-xs text-gray-300 mt-2">
              Note: Other players can still eliminate cards while you decide
            </div>
          </div>
        </div>

        {/* PRIORITY 2: Elimination Actions (always shown even during power decision) */}
        {canEliminate && (
          <div className="p-4 bg-gray-800 rounded-lg border-l-4 border-red-500">
            <div className="flex items-center mb-2">
              <span className="text-red-400 mr-2">⚡</span>
              <h3 className="font-semibold text-white">Elimination Actions</h3>
              <span className="ml-2 text-yellow-400 text-sm">
                Always Available
              </span>
            </div>

            <div className="space-y-2">
              {hasAlreadyEliminated ? (
                <div className="text-yellow-400 text-sm text-center">
                  ⏳ You already eliminated a card this round.
                </div>
              ) : (
                <div className="text-center">
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
          </div>
        )}
      </div>
    );
  }

  // If player has an active power (after activation), show power UI
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
      {/* PRIORITY 1: Elimination Actions (always available when discard pile has cards) */}
      {canEliminate && (
        <div className="p-4 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 border-2 border-red-400">
          <div className="text-center">
            <h3 className="font-bold text-white text-lg mb-2">
              🎯 Card Elimination Available
            </h3>
            <div className="text-sm text-white mb-3">
              {hasAlreadyEliminated
                ? "✅ You already eliminated a card this round"
                : "Click ❌ on any matching card to eliminate it from the game!"}
            </div>
            {!hasAlreadyEliminated && (
              <div className="text-xs text-gray-200 bg-black bg-opacity-20 rounded p-2">
                <strong>Rule:</strong> Click any card that matches the rank of
                the top discard card. Wrong elimination = penalty card!
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRIORITY 2: Turn Actions (only during player's turn) */}
      {isPlayerTurn && (
        <div className="p-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 border-2 border-blue-400">
          <div className="text-center">
            <h3 className="font-bold text-white text-lg mb-3">
              🎮 Your Turn Actions
            </h3>

            {/* Drawn Card Section */}
            {drawnCard && (
              <div className="mb-4 p-3 bg-white bg-opacity-10 rounded-lg">
                <div className="text-sm text-white mb-2">
                  <strong>Card You Drew:</strong>
                </div>
                <div className="flex justify-center mb-3">
                  <div className="bg-white text-gray-800 px-3 py-2 rounded-lg font-bold">
                    {drawnCard.rank}{" "}
                    {drawnCard.suit === "hearts"
                      ? "♥️"
                      : drawnCard.suit === "diamonds"
                      ? "♦️"
                      : drawnCard.suit === "clubs"
                      ? "♣️"
                      : "♠️"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded transition-colors text-sm"
                    onClick={() => {
                      /* Swap handled by card clicks */
                    }}
                  >
                    🔄 Click Hand Card to Swap
                  </button>
                  <button
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded transition-colors text-sm"
                    onClick={handleDiscardDrawnCard}
                  >
                    🗑️ Discard
                  </button>
                </div>
                {["7", "8", "9", "10", "Q", "K"].includes(drawnCard.rank) && (
                  <div className="text-xs text-yellow-200 mt-2 bg-yellow-600 bg-opacity-20 rounded p-2">
                    ⚡ Power card! If discarded, you can choose to activate its
                    power.
                  </div>
                )}
              </div>
            )}

            {/* Main Actions */}
            <div className="space-y-2">
              {!drawnCard && (
                <button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                  onClick={handleDrawCard}
                >
                  🃏 Draw Card
                </button>
              )}

              <button
                onClick={onDeclare}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                🏆 Declare (End Round)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Information Panel */}
      {!isPlayerTurn && !canEliminate && (
        <div className="p-4 rounded-lg bg-gray-700 border-2 border-gray-500">
          <div className="text-center">
            <h3 className="font-bold text-white text-lg mb-2">⏳ Waiting...</h3>
            <div className="text-sm text-gray-300">
              {gameState?.players[gameState.currentPlayerIndex]?.name ||
                "Another player"}
              's turn
            </div>
            {!canEliminate && (
              <div className="text-xs text-gray-400 mt-2">
                No elimination opportunities available
              </div>
            )}
          </div>
        </div>
      )}

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
