import React from "react";
import Card from "./Card";

interface CardType {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  rank: "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
}

interface DeckProps {
  cardsRemaining: number;
  onDeckClick?: () => void;
  drawnCard?: CardType | null;
  onDrawnCardSwipe?: () => void;
  canDiscardDrawnCard?: boolean;
  isPlayerTurn?: boolean;
}

const Deck: React.FC<DeckProps> = ({ 
  cardsRemaining, 
  onDeckClick, 
  drawnCard,
  onDrawnCardSwipe,
  canDiscardDrawnCard = false,
  isPlayerTurn = false
}) => {
  const isClickable = !!onDeckClick && !drawnCard;
  const showDrawnCard = !!drawnCard;
  
  return (
    <div className="relative flex items-center justify-center" style={{ width: "100%" }}>
      {/* Deck base */}
      <div
        className={`
          uniform-card
          bg-gradient-to-br from-blue-600 to-blue-800
          border-2 border-blue-400
          rounded-lg shadow-xl
          relative
          transition-all duration-200
          box-border
          flex-shrink-0
          ${isClickable 
            ? "cursor-pointer hover:scale-105 hover:shadow-2xl hover:border-blue-300 animate-pulse" 
            : "cursor-default opacity-75"
          }
          ${showDrawnCard ? "opacity-50" : ""}
        `}
        onClick={onDeckClick}
      >
        {/* Card count badge */}
        <div className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center shadow-lg border-2 border-white z-10">
          {cardsRemaining}
        </div>
        
        {/* Deck pattern */}
        <div className="flex justify-center items-center h-full">
          <div className="relative">
            <span
              className="text-white text-6xl md:text-7xl"
              style={{ fontSize: "4em" }}
            >
              🎴
            </span>
            {isClickable && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full animate-ping"></div>
              </div>
            )}
          </div>
        </div>
        
        {/* Clickable indicator */}
        {isClickable && (
          <div className="absolute bottom-2 left-0 right-0 text-center">
            <div className="text-xs text-white font-semibold bg-blue-700 bg-opacity-75 rounded px-2 py-1">
              Draw
            </div>
          </div>
        )}
      </div>

      {/* Drawn Card - positioned on top of deck with flip animation */}
      {showDrawnCard && drawnCard && (
        <div 
          className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center animate-cardFlip z-30 pointer-events-none"
          style={{
            transformStyle: "preserve-3d",
            perspective: "1000px",
          }}
        >
          <div className="pointer-events-auto">
            <Card
              suit={drawnCard.suit}
              rank={drawnCard.rank}
              isRevealed={true}
              isSelected={false}
              swipeable={isPlayerTurn && canDiscardDrawnCard}
              onSwipeDown={isPlayerTurn && canDiscardDrawnCard ? onDrawnCardSwipe : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Deck;
