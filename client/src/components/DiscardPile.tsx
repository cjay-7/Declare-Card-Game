import React from "react";

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
  count,
  onDiscardClick,
}) => {
  if (!topCard) {
    return (
      <div
        className="w-16 h-24 bg-gray-700 rounded shadow flex items-center justify-center"
        onClick={onDiscardClick}
      >
        <span className="text-gray-400">Empty</span>
      </div>
    );
  }

  // Define card colors based on suit
  const suitColors = {
    hearts: "text-red-500",
    diamonds: "text-red-500",
    clubs: "text-gray-800",
    spades: "text-gray-800",
  };

  // Define suit symbols
  const suitSymbols = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠",
  };

  return (
    <div
      className="w-96 h-96 bg-white rounded shadow relative flex flex-col justify-between p-1"
      onClick={onDiscardClick}
    >
      <div className="absolute top-1 right-1 text-xs text-gray-500 font-bold">
        {count}
      </div>

      <div className={`text-sm font-bold ${suitColors[topCard.suit]}`}>
        {topCard.rank}
        <span className="ml-1">{suitSymbols[topCard.suit]}</span>
      </div>

      <div className={`text-center text-2xl ${suitColors[topCard.suit]}`}>
        {suitSymbols[topCard.suit]}
      </div>

      <div
        className={`text-sm font-bold self-end rotate-180 ${
          suitColors[topCard.suit]
        }`}
      >
        {topCard.rank}
        <span className="ml-1">{suitSymbols[topCard.suit]}</span>
      </div>
    </div>
  );
};

export default DiscardPile;
