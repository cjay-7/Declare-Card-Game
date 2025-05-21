import React, { useState, useEffect } from "react";

interface CardProps {
  suit?: "hearts" | "diamonds" | "clubs" | "spades";
  rank?:
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
  isRevealed?: boolean;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
  animate?: "draw" | "discard" | "swap" | "reveal" | "none";
}

const Card: React.FC<CardProps> = ({
  suit,
  rank,
  isRevealed = false,
  isSelected = false,
  isHighlighted = false,
  onClick,
  animate = "none",
}) => {
  const [isAnimating, setIsAnimating] = useState(animate !== "none");
  const [shouldRender, setShouldRender] = useState(true);
  const [animationClass, setAnimationClass] = useState("");

  useEffect(() => {
    if (animate !== "none") {
      setIsAnimating(true);

      // Set the animation class based on the animation type
      switch (animate) {
        case "draw":
          setAnimationClass("animate-cardDraw");
          break;
        case "discard":
          setAnimationClass("animate-cardDiscard");
          break;
        case "swap":
          setAnimationClass("animate-cardSwap");
          break;
        case "reveal":
          setAnimationClass("animate-cardReveal");
          break;
        default:
          setAnimationClass("");
      }

      // Reset animation after it completes
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setAnimationClass("");
      }, 500); // Match this with your animation duration

      return () => clearTimeout(timer);
    }
  }, [animate]);

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

  // Define card backgrounds
  const cardBg = isRevealed ? "bg-white" : "bg-blue-500 pattern-cross-dots-lg";

  // Define selection styles
  const selectionStyles = isSelected
    ? "border-2 border-yellow-400 translate-y-[-8px]"
    : "";

  // Define highlight styles
  const highlightStyles = isHighlighted ? "ring-2 ring-blue-400" : "";

  // If card is not revealed, show back side
  if (!isRevealed) {
    return (
      <div
        className={`w-16 h-24 ${selectionStyles} ${highlightStyles} 
                  ${cardBg} rounded shadow cursor-pointer transform 
                  transition-transform ${animationClass}`}
        onClick={onClick}
      >
        <div className="h-full flex items-center justify-center">
          <div className="bg-white rounded-full h-12 w-12 flex items-center justify-center">
            <span
              role="img"
              aria-label="card back"
              style={{ fontSize: "6em" }}
            >
              🎴
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Show revealed card
  return (
    <div
      className={`w-16 h-24 ${selectionStyles} ${highlightStyles}
                ${cardBg} rounded shadow cursor-pointer transform 
                transition-transform ${animationClass}
                flex flex-col justify-between p-1`}
      onClick={onClick}
    >
      {suit && rank ? (
        <>
          <div className={`text-sm font-bold ${suitColors[suit]}`}>
            {rank}
            <span className="ml-1">{suitSymbols[suit]}</span>
          </div>

          <div className={`text-center text-2xl ${suitColors[suit]}`}>
            {suitSymbols[suit]}
          </div>

          <div
            className={`text-sm font-bold self-end rotate-180 ${suitColors[suit]}`}
          >
            {rank}
            <span className="ml-1">{suitSymbols[suit]}</span>
          </div>
        </>
      ) : (
        <div className="h-full flex items-center justify-center text-sm text-gray-400">
          Empty
        </div>
      )}
    </div>
  );
};

export default Card;
