// components/PlayerInfo.tsx - Fixed to handle both old and new prop formats
import React from "react";

// Define Player type based on game logic
interface Player {
  id: string;
  name: string;
  isHost: boolean;
  hand: any[];
  score: number;
  knownCards: string[];
  skippedTurn: boolean;
  hasEliminatedThisRound: boolean;
  activePower?: string;
  isSelectingCardToGive?: boolean;
}

// Support both old format (individual props) and new format (player object)
interface PlayerInfoPropsOld {
  name: string;
  isHost: boolean;
  isCurrentTurn: boolean;
  isCurrentPlayer: boolean;
  player?: never;
  isPlayerTurn?: never;
}

interface PlayerInfoPropsNew {
  player: Player;
  isCurrentPlayer: boolean;
  isPlayerTurn: boolean;
  name?: never;
  isHost?: never;
  isCurrentTurn?: never;
}

type PlayerInfoProps = PlayerInfoPropsOld | PlayerInfoPropsNew;

const PlayerInfo: React.FC<PlayerInfoProps> = (props) => {
  // Handle both prop formats
  let name: string;
  let isHost: boolean;
  let isCurrentTurn: boolean;
  let isCurrentPlayer: boolean;
  let player: Player | undefined;
  let cardCount: number = 0;
  let score: number = 0;
  let activePower: string | undefined;
  let isSelectingCardToGive: boolean = false;

  if ("player" in props && props.player) {
    // New format - player object
    player = props.player;
    name = player.name;
    isHost = player.isHost;
    isCurrentTurn = props.isPlayerTurn;
    isCurrentPlayer = props.isCurrentPlayer;
    cardCount = player.hand
      ? player.hand.filter((card) => card !== null).length
      : 0;
    score = player.score || 0;
    activePower = player.activePower;
    isSelectingCardToGive = player.isSelectingCardToGive || false;
  } else {
    // Old format - individual props
    name = props.name;
    isHost = props.isHost;
    isCurrentTurn = props.isCurrentTurn;
    isCurrentPlayer = props.isCurrentPlayer;
  }

  return (
    <div className="bg-gray-700 rounded-lg p-3 mb-3">
      <div className="flex items-center justify-between">
        {/* Player Name and Status */}
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center mr-3 text-sm font-bold">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center">
              <span
                className={`font-medium ${
                  isCurrentPlayer ? "text-blue-400" : "text-white"
                }`}
              >
                {name}
              </span>
              {isHost && (
                <span className="ml-2 text-yellow-400 text-sm">👑</span>
              )}
              {isCurrentPlayer && (
                <span className="ml-2 text-green-400 text-xs">(You)</span>
              )}
            </div>

            {/* Additional info for player object format */}
            {player && (
              <div className="text-xs text-gray-400 mt-1">
                <span>Cards: {cardCount}</span>
                {score > 0 && <span className="ml-3">Score: {score}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center space-x-2">
          {/* Turn Indicator */}
          {isCurrentTurn && (
            <div className="flex items-center bg-green-600 px-2 py-1 rounded text-xs">
              <span className="animate-pulse text-white mr-1">●</span>
              <span className="text-white font-medium">Turn</span>
            </div>
          )}

          {/* Active Power Indicator */}
          {activePower && (
            <div className="bg-purple-600 px-2 py-1 rounded text-xs text-white font-medium">
              {activePower} Power
            </div>
          )}

          {/* Card Selection Indicator */}
          {isSelectingCardToGive && (
            <div className="bg-yellow-600 px-2 py-1 rounded text-xs text-white font-medium">
              🎯 Selecting
            </div>
          )}
        </div>
      </div>

      {/* Special states info */}
      {player && (activePower || isSelectingCardToGive) && (
        <div className="mt-2 text-xs text-gray-300">
          {activePower && (
            <div>
              <span className="text-purple-300">Active Power:</span>{" "}
              {activePower}
              {activePower === "7" || activePower === "8"
                ? " (Peek own card)"
                : activePower === "9" || activePower === "10"
                ? " (Peek opponent's card)"
                : activePower === "Q"
                ? " (Unseen swap)"
                : activePower === "K"
                ? " (Seen swap)"
                : ""}
            </div>
          )}
          {isSelectingCardToGive && (
            <div className="text-yellow-300">
              Must choose a card to give to opponent
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerInfo;
