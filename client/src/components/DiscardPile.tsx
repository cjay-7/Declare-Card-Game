import React from "react";
import Card from "./Card";

interface CardType {
  id: string;
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  rank:
    | "A"
    | "2"
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "9"
    | "10"
    | "J"
    | "Q"
    | "K";
}

interface DiscardPileProps {
  topCard: CardType | null;
  count: number;
  onDiscardClick?: () => void;
}

const DiscardPile: React.FC<DiscardPileProps> = ({
  topCard,
  onDiscardClick,
}) => {
  const isClickable = !!onDiscardClick;

  if (!topCard) {
    return (
      <div
        className={`
          uniform-card
          bg-surface-container-high border-2 border-outline
          rounded-lg shadow-lg
          flex items-center justify-center
          transition-all duration-200
          box-border
          flex-shrink-0
          ${isClickable
            ? "cursor-pointer hover:scale-105 hover:border-success-fg hover:bg-surface-container-highest"
            : "cursor-default"
          }
        `}
        onClick={onDiscardClick}
      >
        <span className="text-on-surface-variant text-sm font-semibold">Empty</span>
      </div>
    );
  }

  return (
    <Card
      suit={topCard.suit}
      rank={topCard.rank}
      isRevealed={true}
      onClick={onDiscardClick}
    />
  );
};

export default DiscardPile;
