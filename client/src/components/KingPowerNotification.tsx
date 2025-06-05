// client/src/components/KingPowerNotification.tsx
import React from "react";
import { useGameContext } from "../contexts/GameContext";
import Card from "./Card";

const KingPowerNotification: React.FC = () => {
  const { kingPowerReveal } = useGameContext();

  if (!kingPowerReveal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-lg p-6 max-w-2xl w-full border-4 border-yellow-400 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-2">
            <span className="text-4xl mr-3">👑</span>
            <h2 className="text-2xl font-bold text-white">
              King Power Active!
            </h2>
            <span className="text-4xl ml-3">👑</span>
          </div>
          <p className="text-yellow-100 text-lg">
            <span className="font-bold">{kingPowerReveal.powerUserName}</span>{" "}
            is revealing cards before the swap
          </p>
        </div>

        {/* Cards Being Revealed */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          {/* Card 1 */}
          <div className="text-center">
            <h3 className="text-white font-bold mb-3 text-lg">
              {kingPowerReveal.card1.playerName}'s Card
            </h3>
            <div className="flex justify-center mb-2">
              <div className="transform scale-125">
                <Card
                  suit={kingPowerReveal.card1.card.suit}
                  rank={kingPowerReveal.card1.card.rank}
                  isRevealed={true}
                  isHighlighted={true}
                  animate="reveal"
                />
              </div>
            </div>
            <div className="text-yellow-200 text-sm">
              Position {kingPowerReveal.card1.cardIndex + 1}
            </div>
            <div className="text-white font-semibold">
              {kingPowerReveal.card1.card.rank} of{" "}
              {kingPowerReveal.card1.card.suit}
            </div>
            <div className="text-yellow-200 text-sm">
              Value: {kingPowerReveal.card1.card.value} points
            </div>
          </div>

          {/* Swap Arrow */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="text-4xl text-white animate-pulse">↔️</div>
          </div>

          {/* Card 2 */}
          <div className="text-center">
            <h3 className="text-white font-bold mb-3 text-lg">
              {kingPowerReveal.card2.playerName}'s Card
            </h3>
            <div className="flex justify-center mb-2">
              <div className="transform scale-125">
                <Card
                  suit={kingPowerReveal.card2.card.suit}
                  rank={kingPowerReveal.card2.card.rank}
                  isRevealed={true}
                  isHighlighted={true}
                  animate="reveal"
                />
              </div>
            </div>
            <div className="text-yellow-200 text-sm">
              Position {kingPowerReveal.card2.cardIndex + 1}
            </div>
            <div className="text-white font-semibold">
              {kingPowerReveal.card2.card.rank} of{" "}
              {kingPowerReveal.card2.card.suit}
            </div>
            <div className="text-yellow-200 text-sm">
              Value: {kingPowerReveal.card2.card.value} points
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="text-center">
          <div className="bg-yellow-500 bg-opacity-20 rounded-lg p-4 border border-yellow-300">
            <p className="text-white text-lg font-semibold mb-2">
              🔄 Swapping in progress...
            </p>
            <p className="text-yellow-100 text-sm">
              Both cards are revealed as required by the King power. The swap
              will complete automatically.
            </p>
          </div>
        </div>

        {/* Power Description */}
        <div className="mt-4 text-center">
          <div className="text-yellow-200 text-xs">
            <strong>King Power:</strong> Allows seen swap - both cards are
            revealed before swapping
          </div>
        </div>
      </div>
    </div>
  );
};

export default KingPowerNotification;
