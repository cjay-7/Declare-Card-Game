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
  isRevealed: boolean;
  position: number;
}

interface HandProps {
  cards: CardType[];
  onCardClick: (card: CardType) => void;
}

const Hand: React.FC<HandProps> = ({ cards, onCardClick }) => {
  if (cards.length === 0) {
    return (
      <div className="flex justify-center gap-2">
        <div className="w-16 h-24 bg-gray-700 border border-gray-600 rounded shadow flex items-center justify-center">
          <span className="text-gray-400">Empty</span>
        </div>
        <div className="w-16 h-24 bg-gray-700 border border-gray-600 rounded shadow flex items-center justify-center">
          <span className="text-gray-400">Empty</span>
        </div>
        <div className="w-16 h-24 bg-gray-700 border border-gray-600 rounded shadow flex items-center justify-center">
          <span className="text-gray-400">Empty</span>
        </div>
        <div className="w-16 h-24 bg-gray-700 border border-gray-600 rounded shadow flex items-center justify-center">
          <span className="text-gray-400">Empty</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-2">
      {cards.map((card) => (
        <div
          key={card.id}
          onClick={() => onCardClick(card)}
        >
          <Card />
        </div>
      ))}
    </div>
  );
};

export default Hand;
