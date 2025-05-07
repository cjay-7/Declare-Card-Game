import React from "react";

interface PlayerProps {
  id: string;
  name: string;
  isHost: boolean;
  isCurrentTurn: boolean;
  score: number;
  isCurrentPlayer: boolean;
  cardCount: number;
}

const Player: React.FC<PlayerProps> = ({
  name,
  isHost,
  isCurrentTurn,
  score,
  isCurrentPlayer,
  cardCount,
}) => {
  return (
    <div
      className={`p-2 rounded flex items-center justify-between
                ${isCurrentTurn ? "bg-blue-700" : "bg-gray-800"}
                ${isCurrentPlayer ? "border-2 border-yellow-400" : ""}`}
    >
      <div className="flex items-center">
        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center mr-2">
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center">
            <span className="font-medium">{name}</span>
            {isHost && <span className="ml-2 text-yellow-400 text-xs">👑</span>}
            {isCurrentPlayer && (
              <span className="ml-2 text-green-400 text-xs">(You)</span>
            )}
          </div>
          <div className="text-xs text-gray-400">Score: {score}</div>
        </div>
      </div>

      <div className="flex items-center">
        {isCurrentTurn && (
          <div className="mr-2 animate-pulse">
            <span className="text-green-400">●</span>
          </div>
        )}
        <div className="bg-gray-700 px-2 py-1 rounded text-xs">
          {cardCount} cards
        </div>
      </div>
    </div>
  );
};

export default Player;
