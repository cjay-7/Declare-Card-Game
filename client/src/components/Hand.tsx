// client/src/components/Hand.tsx
import React from "react";
import Card from "./Card";
import { useGameContext } from "../contexts/GameContext";
import type { Card as CardType } from "../utils/cardUtils";

interface HandProps {
  cards: CardType[];
  playerId: string;
  isCurrentPlayer: boolean;
}

const Hand: React.FC<HandProps> = ({ cards, playerId, isCurrentPlayer }) => {
  const {
    handleSelectCard,
    selectedCard,
    handleCardClick,
    temporaryRevealedCards,
  } = useGameContext();

  if (cards.length === 0) {
    return (
      <div className="flex justify-center gap-2">
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
    <div className="flex justify-center gap-2">
      {sortedCards.map((card, index) => {
        // Determine if this card should be revealed:
        // 1. Card is permanently revealed (isRevealed=true)
        // 2. Card is temporarily revealed (in temporaryRevealedCards array)
        const shouldReveal =
          card.isRevealed ||
          (isCurrentPlayer && temporaryRevealedCards.includes(index));

        return (
          <div
            key={card.id}
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
        );
      })}
    </div>
  );
};

export default Hand;
