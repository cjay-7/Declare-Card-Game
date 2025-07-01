// components/DiscardPile.tsx - Fixed discard pile component
import React from "react";

interface CardType {
  id: string;
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  rank: "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
  value: number;
}

interface DiscardPileProps {
  topCard: CardType | null;
  cardCount?: number; // For compatibility
  count?: number; // Alternative prop name
  onDiscardClick?: () => void;
}

const DiscardPile: React.FC<DiscardPileProps> = ({
  topCard,
  cardCount,
  count,
  onDiscardClick,
}) => {
  // Use either prop name for count
  const pileCount = cardCount ?? count ?? 0;

  // Define card colors based on suit
  const suitColors = {
    hearts: "text-red-500",
    diamonds: "text-red-500",
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
      <div className="relative">
        <div
          className={`w-16 h-24 bg-gray-600 border-2 border-gray-500 border-dashed rounded shadow flex items-center justify-center ${
            onDiscardClick ? "cursor-pointer hover:bg-gray-500" : ""
          }`}
          onClick={onDiscardClick}
        >
          <span className="text-gray-400 text-xs text-center">Empty<br/>Pile</span>
        </div>
        
        <div className="text-center mt-2 text-xs text-gray-400">
          Discard Pile
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Stack effect for multiple cards */}
      {pileCount > 1 && (
        <>
          <div className="absolute top-1 left-1 w-16 h-24 bg-white rounded shadow border border-gray-300"></div>
          {pileCount > 2 && (
            <div className="absolute top-0.5 left-0.5 w-16 h-24 bg-white rounded shadow border border-gray-300"></div>
          )}
        </>
      )}
      
      {/* Top card */}
      <div
        className={`w-16 h-24 bg-white rounded shadow border-2 border-gray-300 flex flex-col justify-between p-1 relative transition-all duration-200 ${
          onDiscardClick ? "cursor-pointer hover:scale-105 hover:shadow-lg" : ""
        }`}
        onClick={onDiscardClick}
      >
        {/* Card count indicator */}
        {pileCount > 0 && (
          <div className="absolute -top-2 -right-2 w-5 h-5 bg-gray-800 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {pileCount}
          </div>
        )}

        {/* Top-left rank and suit */}
        <div className={`text-xs font-bold ${suitColors[topCard.suit]}`}>
          <div>{topCard.rank}</div>
          <div>{suitSymbols[topCard.suit]}</div>
        </div>

        {/* Center suit symbol */}
        <div className={`text-center text-2xl ${suitColors[topCard.suit]}`}>
          {suitSymbols[topCard.suit]}
        </div>

        {/* Bottom-right rank and suit (rotated) */}
        <div className={`text-xs font-bold self-end transform rotate-180 ${suitColors[topCard.suit]}`}>
          <div>{topCard.rank}</div>
          <div>{suitSymbols[topCard.suit]}</div>
        </div>
      </div>
      
      {/* Label */}
      <div className="text-center mt-2 text-xs text-gray-400">
        {onDiscardClick ? "Click to discard" : "Discard"}
      </div>
    </div>
  );
};

export default DiscardPile;