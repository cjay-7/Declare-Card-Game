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
  const isClickable = !!onDiscardClick;
  
  // Define card colors based on suit
  const suitColors = {
    hearts: "text-red-600",
    diamonds: "text-red-600",
    clubs: "text-black",
    spades: "text-black",
  };

  // Define suit symbols
  const suitSymbols = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠",
  };

  if (!topCard) {
    return (
      <div
        className={`
          uniform-card
          bg-gray-700 border-2 border-gray-600
          rounded-lg shadow-lg
          flex items-center justify-center
          transition-all duration-200
          box-border
          flex-shrink-0
          ${isClickable 
            ? "cursor-pointer hover:scale-105 hover:border-green-400 hover:bg-gray-600" 
            : "cursor-default"
          }
        `}
        onClick={onDiscardClick}
      >
        <span className="text-gray-400 text-sm font-semibold">Empty</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Stack effect - show multiple cards stacked */}
      {count > 1 && (
        <>
          <div className="absolute top-1 left-1 w-20 h-32 md:w-24 md:h-36 lg:w-28 lg:h-44 bg-gray-600 rounded-lg transform translate-x-1 translate-y-1 opacity-50"></div>
          {count > 2 && (
            <div className="absolute top-2 left-2 w-20 h-32 md:w-24 md:h-36 lg:w-28 lg:h-44 bg-gray-500 rounded-lg transform translate-x-1 translate-y-1 opacity-30"></div>
          )}
        </>
      )}
      
      <div
        className={`
          uniform-card
          bg-white border-2 ${isClickable ? "border-green-400" : "border-gray-300"}
          rounded-lg shadow-xl
          relative flex flex-col justify-between p-2
          transition-all duration-200
          box-border
          flex-shrink-0
          ${isClickable 
            ? "cursor-pointer hover:scale-105 hover:shadow-2xl hover:border-green-300" 
            : "cursor-default"
          }
        `}
        onClick={onDiscardClick}
      >
        {/* Count badge */}
        {count > 1 && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg border-2 border-white">
            {count}
          </div>
        )}

        {/* Card content */}
        <div className={`text-sm md:text-base font-bold ${suitColors[topCard.suit]}`}>
          {topCard.rank}
          <span className="ml-1">{suitSymbols[topCard.suit]}</span>
        </div>

        <div className={`text-center text-3xl md:text-4xl ${suitColors[topCard.suit]}`}>
          {suitSymbols[topCard.suit]}
        </div>

        <div
          className={`text-sm md:text-base font-bold self-end rotate-180 ${
            suitColors[topCard.suit]
          }`}
        >
          {topCard.rank}
          <span className="ml-1">{suitSymbols[topCard.suit]}</span>
        </div>
        
        {/* Clickable indicator */}
        {isClickable && (
          <div className="absolute bottom-2 left-0 right-0 text-center">
            <div className="text-xs text-white font-semibold bg-green-600 bg-opacity-90 rounded px-2 py-1">
              Discard
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscardPile;
