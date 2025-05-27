// client/src/components/HandGrid.tsx - Updated with proper power handling
import React from "react";
import Card from "./Card";
import { useGameContext } from "../contexts/GameContext";
import socket from "../socket";
import type { Card as CardType } from "../utils/cardUtils";

interface HandGridProps {
  cards: CardType[];
  playerId: string;
  isCurrentPlayer: boolean;
  isPlayerTurn?: boolean;
}

const HandGrid: React.FC<HandGridProps> = ({
  cards,
  playerId,
  isCurrentPlayer,
  isPlayerTurn = false,
}) => {
  const {
    handleSelectCard,
    selectedCard,
    handleCardClick,
    temporaryRevealedCards,
    hasDrawnFirstCard,
    handleEliminateCard,
    drawnCard,
    gameState,
    myPlayer,
  } = useGameContext();

  // Check if current player has an active power
  const currentPlayer = gameState?.players.find((p) => p.id === socket.getId());
  const activePower = currentPlayer?.activePower;

  // Check if this hand should show power interaction hints
  const canUsePowerOnThisHand =
    activePower &&
    ((["7", "8"].includes(activePower) && isCurrentPlayer) ||
      (["9", "10"].includes(activePower) && !isCurrentPlayer));

  if (cards.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="w-16 h-24 bg-gray-700 rounded shadow flex items-center justify-center"
          >
            <span className="text-gray-400">Empty</span>
          </div>
        ))}
      </div>
    );
  }

  // Sort cards by position
  const sortedCards = [...cards].sort(
    (a, b) => (a.position || 0) - (b.position || 0)
  );

  // Check if there's a card in the discard pile
  const hasDiscardCard =
    gameState?.discardPile && gameState.discardPile.length > 0;

  return (
    <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto relative">
      {/* Power interaction overlay */}
      {canUsePowerOnThisHand && (
        <div className="absolute inset-0 bg-purple-500 bg-opacity-20 rounded-lg border-2 border-purple-400 border-dashed flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-purple-600 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-lg">
            {["7", "8"].includes(activePower)
              ? "Peek at your card"
              : "Peek at opponent's card"}
          </div>
        </div>
      )}

      {sortedCards.map((card, index) => {
        // Determine if this card should be revealed:
        // 1. Card is permanently revealed through gameplay (isRevealed=true)
        // 2. Current player can see their own bottom 2 cards ONLY before first draw
        // 3. Card is temporarily revealed (in temporaryRevealedCards array)
        // 4. Card is temporarily revealed by power usage (card.isRevealed = true from server)
        const shouldReveal =
          card.isRevealed || // This includes power-revealed cards from server
          (isCurrentPlayer && index >= 2 && !hasDrawnFirstCard) || // Bottom 2 visible only before first draw
          (isCurrentPlayer && temporaryRevealedCards.includes(index)); // Manual temporary reveals

        // Show eliminate button when there's a discard card - on ANY player's cards during matching window
        // Check if this player has already eliminated a card this round
        const currentPlayer = gameState?.players.find(
          (p) => p.id === socket.getId()
        );
        const hasAlreadyEliminated =
          currentPlayer?.hasEliminatedThisRound || false;

        const showEliminateButton =
          !drawnCard && hasDiscardCard && !hasAlreadyEliminated && !activePower;

        // Show power glow effect when card can be used with active power
        const showPowerGlow = canUsePowerOnThisHand;

        // Check if this is a temporarily revealed card by power (for visual feedback)
        // This applies to cards revealed by 7,8,9,10 powers
        const isTemporarilyRevealedByPower =
          card.isRevealed && !isCurrentPlayer;

        return (
          <div
            key={card.id}
            className="flex justify-center relative"
          >
            <div
              onClick={() => {
                if (activePower && canUsePowerOnThisHand) {
                  // Handle power usage
                  handleCardClick(playerId, index);
                } else if (isCurrentPlayer) {
                  handleSelectCard(card);
                } else {
                  handleCardClick(playerId, index);
                }
              }}
              className={`${showPowerGlow ? "animate-pulse" : ""}`}
            >
              <Card
                suit={shouldReveal ? card.suit : undefined}
                rank={shouldReveal ? card.rank : undefined}
                isRevealed={shouldReveal}
                isSelected={selectedCard?.cardId === card.id && isCurrentPlayer}
                isHighlighted={showPowerGlow || isTemporarilyRevealedByPower}
                animate={
                  temporaryRevealedCards.includes(index)
                    ? "reveal"
                    : isTemporarilyRevealedByPower
                    ? "reveal"
                    : undefined
                }
              />
            </div>

            {/* Power indicator for active powers */}
            {showPowerGlow && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-bounce">
                {activePower}
              </div>
            )}

            {/* Temporary reveal indicator for power-revealed cards */}
            {isTemporarilyRevealedByPower && (
              <div className="absolute -top-2 -left-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-ping">
                👁️
              </div>
            )}

            {/* Eliminate button */}
            {showEliminateButton && !showPowerGlow && (
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card selection
                  handleEliminateCard(card.id);
                }}
                className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 hover:bg-red-700 
                          rounded-full flex items-center justify-center text-white text-xs
                          border-2 border-white shadow-lg transition-colors"
                title="Eliminate this card"
              >
                ❌
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default HandGrid;
