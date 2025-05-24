import React from "react";

interface DeckProps {
  cardsRemaining: number;
  onDeckClick?: () => void;
}

const Deck: React.FC<DeckProps> = ({ cardsRemaining, onDeckClick }) => {
  return (
    <div
      className="w-16 h-24 bg-blue-500 border border-blue-700 rounded shadow cursor-pointer relative"
      onClick={onDeckClick}
    >
      <div className="absolute top-1 left-1 text-xs text-white font-bold">
        {cardsRemaining}
      </div>
      <div className="flex justify-center items-center h-full">
        <span
          className="text-white"
          style={{ fontSize: "6em" }}
        >
          🎴
        </span>
      </div>
    </div>
  );
};

export default Deck;
