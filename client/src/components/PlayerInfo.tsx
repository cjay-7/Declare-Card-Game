import React from "react";

interface PlayerInfoProps {
  name: string;
  isHost: boolean;
  isCurrentTurn: boolean;
  isCurrentPlayer: boolean;
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({
  name,
  isHost,
  isCurrentTurn,
  isCurrentPlayer,
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center mr-2 text-xs">
          {name.charAt(0).toUpperCase()}
        </div>
        <span
          className={`font-medium ${
            isCurrentPlayer ? "text-blue-400" : "text-white"
          }`}
        >
          {name}
          {isHost && <span className="ml-1 text-yellow-400 text-xs">👑</span>}
          {isCurrentPlayer && <span className="ml-1 text-xs">(You)</span>}
        </span>
      </div>

      {isCurrentTurn && (
        <div className="flex items-center">
          <span className="animate-pulse text-green-400">●</span>
          <span className="ml-1 text-xs text-green-400">Turn</span>
        </div>
      )}
    </div>
  );
};

export default PlayerInfo;
