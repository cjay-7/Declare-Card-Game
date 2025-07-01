// components/Deck.tsx - Deck component for drawing cards
import React from "react";

interface DeckProps {
  cardCount?: number; // For compatibility with both prop names
  cardsRemaining?: number; // Alternative prop name
  onDrawCard?: () => void;
  onDeckClick?: () => void; // Alternative callback name
  canDraw?: boolean;
}

const Deck: React.FC<DeckProps> = ({
  cardCount,
  cardsRemaining,
  onDrawCard,
  onDeckClick,
  canDraw = true,
}) => {
  // Use either prop name for card count
  const deckSize = cardCount ?? cardsRemaining ?? 0;

  // Use either callback
  const handleClick = onDrawCard ?? onDeckClick;

  const isClickable = canDraw && handleClick && deckSize > 0;

  if (deckSize === 0) {
    return (
      <div className="w-16 h-24 bg-gray-600 border-2 border-gray-500 border-dashed rounded shadow flex items-center justify-center">
        <span className="text-gray-400 text-xs text-center">
          Empty
          <br />
          Deck
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative ${isClickable ? "cursor-pointer" : ""}`}
      onClick={isClickable ? handleClick : undefined}
    >
      {/* Stack of cards effect */}
      <div className="relative">
        {/* Bottom card (shadow) */}
        <div className="absolute top-1 left-1 w-16 h-24 bg-gray-700 rounded shadow"></div>

        {/* Middle card (shadow) */}
        <div className="absolute top-0.5 left-0.5 w-16 h-24 bg-gray-600 rounded shadow"></div>

        {/* Top card (main) */}
        <div
          className={`w-16 h-24 bg-blue-900 rounded shadow border-2 flex flex-col items-center justify-center text-white relative transition-all duration-200 ${
            isClickable
              ? "border-blue-400 hover:bg-blue-800 hover:scale-105 hover:shadow-lg"
              : "border-gray-500"
          }`}
        >
          {/* Card back pattern */}
          <div className="text-blue-300 text-2xl mb-1">🎴</div>

          {/* Card count */}
          <div className="text-xs font-bold">{deckSize}</div>

          {/* Draw indicator */}
          {isClickable && (
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
          )}
        </div>
      </div>

      {/* Label */}
      <div className="text-center mt-2 text-xs text-gray-400">
        {isClickable ? "Click to draw" : "Deck"}
      </div>
    </div>
  );
};

export default Deck;
