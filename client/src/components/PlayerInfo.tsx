import React from "react";

interface PlayerInfoProps {
  name: string;
  isHost: boolean;
  isCurrentTurn: boolean;
  isCurrentPlayer: boolean;
}

// Generate consistent color for player based on name
const getPlayerColor = (name: string): string => {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-yellow-500",
    "bg-indigo-500",
    "bg-red-500",
    "bg-teal-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const PlayerInfo: React.FC<PlayerInfoProps> = ({
  name,
  isHost,
  isCurrentTurn,
  isCurrentPlayer,
}) => {
  const playerColor = getPlayerColor(name);
  
  return (
    <div className={`flex items-center justify-between p-2 rounded-lg ${
      isCurrentTurn ? "bg-gray-600" : "bg-transparent"
    }`}>
      <div className="flex items-center gap-3">
        {/* Enhanced Avatar */}
        {/* <div className={`${playerColor} w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base shadow-lg ${
          isCurrentTurn ? "ring-2 ring-green-400 ring-offset-2 ring-offset-gray-700" : ""
        }`}>
          {name.charAt(0).toUpperCase()}
        </div> */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span
              className={`font-bold text-base md:text-lg ${
                isCurrentPlayer ? "text-blue-300" : "text-white"
              }`}
            >
              {name}
            </span>
            {/* {isHost && (
              <span className="text-yellow-400 text-sm animate-pulse" title="Host">
                👑
              </span>
            )} */}
            {/* {isCurrentPlayer && (
              <span className="text-xs text-blue-400 bg-blue-900 px-2 py-0.5 rounded">
                You
              </span>
            )} */}
          </div>
          {/* {isCurrentTurn && (
            <span className="text-xs text-green-400 font-semibold animate-pulse">
              ● Active Turn
            </span>
          )} */}
        </div>
      </div>

      {/* {isCurrentTurn && (
        <div className="flex items-center bg-green-600 px-3 py-1 rounded-full">
          <span className="animate-pulse text-white text-sm font-semibold">
            ● Turn
          </span>
        </div>
      )} */}
    </div>
  );
};

export default PlayerInfo;
