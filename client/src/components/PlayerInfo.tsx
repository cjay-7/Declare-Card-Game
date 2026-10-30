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
    "bg-info-strong",
    "bg-success-strong",
    "bg-power-strong",
    "bg-pink-500",
    "bg-warning-strong",
    "bg-indigo-500",
    "bg-error-strong",
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
    <div className="flex items-center">
      <div
        className={`inline-flex items-center gap-2 rounded-full px-4 py-1 ${
          isCurrentTurn
            ? "bg-primary text-on-primary"
            : "bg-surface-container-high text-on-surface"
        }`}
        style={{ boxShadow: "var(--elevation-1)", transition: "background-color var(--transition-base)" }}
      >
      <div className="flex items-center gap-3">
        {/* Enhanced Avatar */}
        {/* <div className={`${playerColor} w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base shadow-lg ${
          isCurrentTurn ? "ring-2 ring-success-fg ring-offset-2 ring-offset-gray-700" : ""
        }`}>
          {name.charAt(0).toUpperCase()}
        </div> */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span
              className={`font-bold text-base md:text-lg ${
                isCurrentTurn ? "text-on-primary" : "text-on-surface"
              }`}
            >
              {name}
            </span>
            {isCurrentPlayer && <span className="text-xs opacity-70">you</span>}
            {/* {isHost && (
              <span className="text-warning text-sm animate-soft-pulse" title="Host">
                👑
              </span>
            )} */}
            {/* {isCurrentPlayer && (
              <span className="text-xs text-info bg-info-container px-2 py-0.5 rounded">
                You
              </span>
            )} */}
          </div>
          {/* {isCurrentTurn && (
            <span className="text-xs text-success-fg font-semibold animate-soft-pulse">
              ● Active Turn
            </span>
          )} */}
        </div>
      </div>

      {/* {isCurrentTurn && (
        <div className="flex items-center bg-success-strong px-3 py-1 rounded-full">
          <span className="animate-soft-pulse text-white text-sm font-semibold">
            ● Turn
          </span>
        </div>
      )} */}
      </div>
    </div>
  );
};

export default PlayerInfo;
