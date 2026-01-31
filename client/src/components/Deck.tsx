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
  const isDisabled = !isPlayerTurn;

  return (
    <div
      className={`relative flex items-center justify-center ${isDisabled ? "cursor-not-allowed" : ""}`}
      style={{ width: "100%" }}
    >
      {/* Deck base - same card back as hand cards */}
      <div
        className={`relative transition-opacity duration-200 ${
          showDrawnCard ? "opacity-50" : ""
        } ${isDisabled ? "opacity-60 cursor-not-allowed pointer-events-none" : "cursor-pointer"}`}
        onClick={onDeckClick}
      >
        <Card isRevealed={false} onClick={isClickable ? onDeckClick : undefined} />
        {/* Clickable indicator */}
        {isClickable && (
          <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
            <div className="text-xs text-white font-semibold bg-blue-700 bg-opacity-75 rounded px-2 py-1 inline-block">
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
