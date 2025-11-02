// client/src/components/Player.tsx - Performance optimized version
import React, { memo } from "react";
import Hand from "./Hand";
import PlayerInfo from "./PlayerInfo";
import type { Card as CardType } from "../utils/cardUtils";

/**
 * Props for the Player component
 */
interface PlayerProps {
  id: string;
  name: string;
  cards: CardType[];
  isCurrentPlayer: boolean;
  isPlayerTurn: boolean;
  cardCount: number;
  score?: number;
  isHost?: boolean;
}

/**
 * Player component for displaying individual player information and hand
 *
 * This component is memoized to prevent unnecessary re-renders when props haven't changed.
 * It displays player information and their hand of cards.
 *
 * @param {PlayerProps} props - The component props
 * @returns {JSX.Element} The rendered player component
 */
const Player: React.FC<PlayerProps> = memo(
  ({
    id,
    name,
    cards,
    isCurrentPlayer,
    isPlayerTurn,
    cardCount,
    score = 0,
    isHost = false,
  }) => {
    return (
      <div className="flex flex-col items-center space-y-2">
        <PlayerInfo
          name={name}
          isCurrentPlayer={isCurrentPlayer}
          isCurrentTurn={isPlayerTurn}
          isHost={isHost}
        />
        <Hand
          cards={cards}
          playerId={id}
          isCurrentPlayer={isCurrentPlayer}
        />
      </div>
    );
  }
);

// Set display name for debugging
Player.displayName = "Player";

export default Player;
