// components/ActionPanel.tsx - Updated with elimination fixes
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
  const isSelectingCardToGive = currentPlayer?.isSelectingCardToGive;

  // FIX 1 & 2: Updated elimination eligibility check
  const canEliminate =
    gameState?.discardPile && 
    gameState.discardPile.length > 0 && 
    !gameState.eliminationUsedThisRound && // Global check
    !currentPlayer?.hasEliminatedThisRound; // Individual check

  // FIX 3: Show card selection UI when giving card
  if (isSelectingCardToGive) {
    return (
      <div className="p-4 bg-yellow-600 rounded-lg">
        <div className="text-center text-white">
          <div className="text-2xl mb-2">🎯</div>
          <h3 className="font-bold text-lg">Choose Card to Give</h3>
          <p className="text-sm">Select one of your cards to give to your opponent</p>
          <p className="text-xs mt-1 opacity-80">Click on any of your non-eliminated cards</p>
          
          <div className="mt-3 p-2 bg-yellow-700 rounded text-xs">
            <div className="font-medium">Instructions:</div>
            <div>• Click on one of your cards (not eliminated ones)</div>
            <div>• The card will be transferred to your opponent</div>
            <div>• This completes the elimination process</div>
          </div>
        </div>
      </div>
    );
  }

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
          description: `Select 2 cards to swap. Both cards will be revealed to all players before swapping. (${swapSelections.length}/2 selected)`,
          icon: "👑",
          color: "bg-red-600",
        };
      default:
        return null;
    }
  };

  const powerInfo = activePower ? getPowerInstructions(activePower) : null;

  return (
    <div className="space-y-4">
      {/* Turn Actions Section */}
      {isPlayerTurn && (
        <div className="p-3 bg-gray-800 rounded-lg">
          <div className="text-center">
            <div className="text-green-400 text-sm font-medium mb-2">
              🎯 Your Turn
            </div>
            
            {drawnCard ? (
              <div className="space-y-3">
                <div className="p-2 bg-gray-700 rounded text-sm text-white">
                  <div className="font-medium">You drew: {drawnCard.rank} of {drawnCard.suit}</div>
                  <div className="text-xs text-gray-300 mt-1">
                    Choose to swap with one of your cards or discard
                  </div>
                </div>
                
                <div className="flex gap-2 text-xs">
                  <div className="flex-1 p-2 bg-blue-700 rounded text-white text-center">
                    Click your card to swap
                  </div>
                  <div className="flex-1 p-2 bg-red-700 rounded text-white text-center">
                    Click here to discard
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Draw Card
                </button>
                <button 
                  onClick={onDeclare}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Declare
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FIX 2: Power Actions Section - can coexist with elimination */}
      {powerInfo && (
        <div className={`p-3 ${powerInfo.color} rounded-lg`}>
          <div className="text-center text-white">
            <div className="text-2xl mb-1">{powerInfo.icon}</div>
            <h4 className="font-bold">{powerInfo.title}</h4>
            <p className="text-sm mt-1">{powerInfo.description}</p>
            
            <div className="mt-2 text-xs opacity-80">
              {activePower === "Q" || activePower === "K" 
                ? "Select cards from any player's hand"
                : activePower === "7" || activePower === "8"
                ? "Select from your own cards"
                : "Select from opponent's cards"
              }
            </div>
          </div>
        </div>
      )}

      {/* FIX 2: Elimination Section - shown even with active power */}
      <div className="p-3 bg-gray-700 rounded-lg">
        <div className="text-center">
          <div className="text-sm font-medium text-gray-300 mb-2">
            🎯 Elimination
          </div>
          
          {gameState?.discardPile && gameState.discardPile.length > 0 ? (
            <div>
              {/* FIX 1: Updated elimination availability */}
              {gameState.eliminationUsedThisRound ? (
                <div className="text-center text-gray-400 text-sm">
                  <div className="text-red-400 mb-1">❌ Elimination Used</div>
                  <div>Someone already eliminated a card this round.</div>
                  <div className="text-xs mt-1">
                    Wait for the next discard to eliminate again.
                  </div>
                </div>
              ) : currentPlayer?.hasEliminatedThisRound ? (
                <div className="text-center text-gray-400 text-sm">
                  <div className="text-orange-400 mb-1">⏳ Already Attempted</div>
                  <div>You already tried to eliminate this round.</div>
                  <div className="text-xs mt-1">
                    Wait for someone else to discard to eliminate again.
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-sm text-gray-300 mb-1">
                    Elimination available! Click ❌ on matching cards.
                  </div>
                  <div className="text-xs text-green-300">
                    Match the top discard card rank ({gameState.discardPile[gameState.discardPile.length - 1]?.rank}) to eliminate it for 0 points!
                  </div>
                  
                  {/* FIX 2: Show that power and elimination can both be used */}
                  {activePower && (
                    <div className="text-xs text-blue-300 mt-2 p-1 bg-blue-900 rounded">
                      💡 You can use your {activePower} power AND eliminate!
                    </div>
                  )}
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
          <div className="text-xs text-gray-400 bg-gray-800 rounded p-2 mt-3">
            <div className="font-medium mb-1">Elimination Rules:</div>
            <div>• Match rank of top discard card</div>
            <div>• Only 1 successful elimination per round (all players)</div>
            <div>• Wrong guess = penalty card</div>
            <div>• Eliminated cards = 0 points</div>
            <div>• Choose which card to give opponent</div>
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
          {/* NEW: Show elimination status */}
          <div className="flex justify-between">
            <span>Elimination used:</span>
            <span className={gameState?.eliminationUsedThisRound ? "text-red-400" : "text-green-400"}>
              {gameState?.eliminationUsedThisRound ? "Yes" : "No"}
            </span>
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