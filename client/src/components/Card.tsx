import React from "react";

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
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  suit,
  rank,
  isRevealed = false,
  isSelected = false,
  onClick,
}) => {
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

  // If card is not revealed, show back side
  if (!isRevealed) {
    return (
      <div
        className={`w-16 h-24 ${
          isSelected ? "border-2 border-yellow-400" : "border border-gray-600"
        } 
                  bg-blue-500 pattern-cross-dots-lg rounded shadow cursor-pointer transform 
                  ${
                    isSelected ? "translate-y-[-8px]" : ""
                  } transition-transform`}
        onClick={onClick}
      >
        <div className="h-full flex items-center justify-center">
          <div className="bg-white rounded-full h-12 w-12 flex items-center justify-center">
            <span
              role="img"
              aria-label="card back"
              className="text-xl"
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
      className={`w-16 h-24 ${
        isSelected ? "border-2 border-yellow-400" : "border border-gray-600"
      } 
                bg-white rounded shadow cursor-pointer transform 
                ${isSelected ? "translate-y-[-8px]" : ""} transition-transform 
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
