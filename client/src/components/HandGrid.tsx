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

  // Check if this hand should show a peek button
  const showPeekButton =
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

  // Remove debug logging since we identified the issue
  // Check if there's a card in the discard pile
  const hasDiscardCard =
    gameState?.discardPile && gameState.discardPile.length > 0;

  return (
    <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto relative">
      {/* Peek button overlay */}
      {showPeekButton && (
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center z-10">
          <div className="bg-white p-3 rounded-lg shadow-lg text-center">
            <div className="text-sm font-bold text-gray-800 mb-2">
              {["7", "8"].includes(activePower)
                ? "Peek at Your Card"
                : "Peek at Opponent's Card"}
            </div>
            <div className="text-xs text-gray-600 mb-3">
              Click any card below to peek at it
            </div>
            <div className="text-2xl">
              {["7", "8"].includes(activePower) ? "👁️" : "🔍"}
            </div>
          </div>
        </div>
      )}

      {sortedCards.map((card, index) => {
        // Determine if this card should be revealed:
        // 1. Card is permanently revealed through gameplay (isRevealed=true)
        // 2. Current player can see their own bottom 2 cards ONLY before first draw
        // 3. Card is temporarily revealed (in temporaryRevealedCards array)
        const shouldReveal =
          card.isRevealed ||
          (isCurrentPlayer && index >= 2 && !hasDrawnFirstCard) || // Bottom 2 visible only before first draw
          (isCurrentPlayer && temporaryRevealedCards.includes(index));

        // Show eliminate button when there's a discard card - on ANY player's cards during matching window
        // Check if this player has already eliminated a card this round
        const currentPlayer = gameState?.players.find(
          (p) => p.id === socket.getId()
        );
        const hasAlreadyEliminated =
          currentPlayer?.hasEliminatedThisRound || false;

        const showEliminateButton =
          !drawnCard && hasDiscardCard && !hasAlreadyEliminated && !activePower;

        // Don't show individual power indicators anymore - we'll show hand-level peek buttons instead

        return (
          <div
            key={card.id}
            className="flex justify-center relative"
          >
            <div
              onClick={() => {
                if (isCurrentPlayer) {
                  handleSelectCard(card);
                } else {
                  handleCardClick(playerId, index);
                }
              }}
            >
              <Card
                suit={shouldReveal ? card.suit : undefined}
                rank={shouldReveal ? card.rank : undefined}
                isRevealed={shouldReveal}
                isSelected={selectedCard?.cardId === card.id && isCurrentPlayer}
                animate={
                  temporaryRevealedCards.includes(index) ? "reveal" : undefined
                }
              />
            </div>

            {/* Eliminate button */}
            {showEliminateButton && (
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
