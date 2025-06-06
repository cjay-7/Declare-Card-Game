import React from "react";
import { useGameContext } from "../contexts/GameContext";

const ViewBottomCardsButton: React.FC = () => {
  const { handleViewBottomCards, hasDrawnFirstCard, gameState } =
    useGameContext();

  const isGameStarted = gameState?.gameStatus === "playing";
  const isDisabled = hasDrawnFirstCard || !isGameStarted;

  return (
    <button
      onClick={handleViewBottomCards}
      disabled={isDisabled}
      className={`px-4 py-2 rounded-lg flex items-center gap-2 
                ${
                  isDisabled
                    ? "bg-gray-600 cursor-not-allowed opacity-50"
                    : "bg-indigo-600 hover:bg-indigo-700 animate-pulse"
                }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
        <path
          fillRule="evenodd"
          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
          clipRule="evenodd"
        />
      </svg>
      View Bottom Cards
    </button>
  );
};

export default ViewBottomCardsButton;
