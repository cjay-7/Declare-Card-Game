/* eslint-disable @typescript-eslint/no-unused-vars */
// client/src/components/Card.tsx - Updated with highlight support
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
  isHighlighted?: boolean | null;
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
          setAnimationClass("animate-bounce");
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

  // Add a special glow effect for temporarily revealed cards
  const tempRevealGlow =
    isRevealed && isHighlighted
      ? "shadow-lg shadow-yellow-400/75 ring-2 ring-yellow-400"
      : "";

  // Define card colors based on suit
  const suitColors = {
    hearts: "text-red-600",     // Red hearts
    diamonds: "text-red-600",   // Red diamonds
    clubs: "text-black",        // Black clubs
    spades: "text-black",       // Black spades
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
    ? "border-2 border-yellow-400 shadow-lg shadow-yellow-400/50"
    : "";

  // Define highlight styles for power usage
  const highlightStyles = isHighlighted
    ? "ring-2 ring-purple-400 ring-opacity-75 shadow-lg shadow-purple-400/50"
    : "";

  // If card is not revealed, show back side
  if (!isRevealed) {
    return (
      <div
        className={`w-16 h-24 ${selectionStyles} ${highlightStyles} 
                  ${cardBg} rounded shadow cursor-pointer transform 
                  transition-all duration-200 hover:scale-105 ${animationClass}
                  ${isHighlighted ? "animate-pulse" : ""}`}
        onClick={onClick}
      >
        <div className="h-full flex items-center justify-center">
          <div className="bg-white rounded-full h-8 w-8 flex items-center justify-center">
            <span
              className="text-6em"
              role="img"
              aria-label="card back"
            >
              🎴
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Show revealed card with special glow for power reveals
  return (
    <div
      className={`w-16 h-24 ${selectionStyles} ${highlightStyles} ${tempRevealGlow}
                ${cardBg} rounded shadow cursor-pointer transform 
                transition-all duration-200 hover:scale-105 ${animationClass}
                flex flex-col justify-between p-1
                ${isHighlighted ? "animate-pulse" : ""}
                ${tempRevealGlow ? "animate-bounce" : ""}`}
      onClick={onClick}
    >
      {suit && rank ? (
        <>
          <div className={`text-xs font-bold ${suitColors[suit]}`}>
            {rank}
            <span className="ml-0.5">{suitSymbols[suit]}</span>
          </div>

          <div className={`text-center text-6em ${suitColors[suit]}`}>
            {suitSymbols[suit]}
          </div>

          <div
            className={`text-xs font-bold self-end rotate-180 ${suitColors[suit]}`}
          >
            {rank}
            <span className="ml-0.5">{suitSymbols[suit]}</span>
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
