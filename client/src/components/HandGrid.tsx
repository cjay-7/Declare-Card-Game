import React from "react";
import Card from "./Card";
import { useGameContext } from "../contexts/GameContext";
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
  } = useGameContext();

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

  return (
    <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
      {sortedCards.map((card, index) => {
        // Determine if this card should be revealed:
        // 1. Card is permanently revealed through gameplay (isRevealed=true)
        // 2. Current player can see their own bottom 2 cards ONLY before first draw
        // 3. Card is temporarily revealed (in temporaryRevealedCards array)
        const shouldReveal =
          card.isRevealed ||
          (isCurrentPlayer && index >= 2 && !hasDrawnFirstCard) || // Bottom 2 visible only before first draw
          (isCurrentPlayer && temporaryRevealedCards.includes(index));

        // Show eliminate button when it's player's turn and no drawn card
        const showEliminateButton =
          isCurrentPlayer && isPlayerTurn && !drawnCard;

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
