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
  const { handleSelectCard, selectedCard, handleCardClick } = useGameContext();

  if (cards.length === 0) {
    return (
      <div className="flex justify-center gap-2">
        {[...Array(4)].map((_, index) => (
          <div 
            key={index} 
            className="w-16 h-24 bg-gray-700 border border-gray-600 rounded shadow flex items-center justify-center"
          >
            <span className="text-gray-400">Empty</span>
          </div>
        ))}
      </div>
    );
  }

  // Sort cards by position
  const sortedCards = [...cards].sort((a, b) => 
    (a.position || 0) - (b.position || 0)
  );

  return (
    <div className="flex justify-center gap-2">
      {sortedCards.map((card, index) => (
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
            suit={card.isRevealed ? card.suit : undefined}
            rank={card.isRevealed ? card.rank : undefined}
            isRevealed={card.isRevealed}
            isSelected={selectedCard?.cardId === card.id && isCurrentPlayer}
          />
        </div>
      ))}
    </div>
  );
};

export default Hand;