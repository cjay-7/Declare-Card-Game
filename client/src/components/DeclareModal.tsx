import React, { useState } from "react";
import type { Card } from "../utils/cardUtils";

interface DeclareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (declaredRanks: string[]) => void;
  playerHand: (Card | null)[]; // Allow null cards for eliminated positions
}

const DeclareModal: React.FC<DeclareModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  playerHand,
}) => {
  // Filter out null cards and only get actual cards
  const actualCards = playerHand.filter((card): card is Card => card !== null);
  const actualCardCount = actualCards.length;

  const [declaredRanks, setDeclaredRanks] = useState<string[]>(
    new Array(actualCardCount).fill("")
  );
  const [error, setError] = useState<string>("");

  if (!isOpen) return null;

  const handleRankChange = (index: number, rank: string) => {
    const newRanks = [...declaredRanks];
    newRanks[index] = rank;
    setDeclaredRanks(newRanks);
    setError("");
  };

  const handleConfirm = () => {
    // Check if all ranks are declared
    if (declaredRanks.some((rank) => rank === "")) {
      setError(`You must declare all ${actualCardCount} card ranks`);
      return;
    }

    // Validation for sets and sequences only makes sense with 4 cards
    if (actualCardCount === 4) {
      // Check for duplicates (unless it's a valid set)
      const rankCounts = declaredRanks.reduce((counts, rank) => {
        counts[rank] = (counts[rank] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      const uniqueRanks = Object.keys(rankCounts);
      const isSet = uniqueRanks.length === 1;
      const hasValidSequence = uniqueRanks.length === 4;

      if (!isSet && !hasValidSequence) {
        // Check if it could be a sequence
        const rankValues = declaredRanks
          .map((rank) => {
            if (rank === "A") return 1;
            if (rank === "J") return 11;
            if (rank === "Q") return 12;
            if (rank === "K") return 13;
            return parseInt(rank);
          })
          .sort((a, b) => a - b);

        let isSequence = true;
        for (let i = 1; i < rankValues.length; i++) {
          if (rankValues[i] !== rankValues[i - 1] + 1) {
            isSequence = false;
            break;
          }
        }

        if (!isSequence) {
          setError(
            "Invalid declaration with 4 cards: Must be a set (4 same ranks) or sequence (4 consecutive ranks of same suit)"
          );
          return;
        }
      }
    }

    onConfirm(declaredRanks);
  };

  const ranks = [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
  ];

  // Calculate eliminated cards info
  const eliminatedCount = playerHand.length - actualCardCount;
  const eliminatedPositions = playerHand
    .map((card, index) => (card === null ? index + 1 : null))
    .filter((pos): pos is number => pos !== null);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Declare Your Hand</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="text-white space-y-4">
          {/* Show eliminated cards info */}
          {eliminatedCount > 0 && (
            <div className="p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded text-red-200">
              <div className="text-sm font-medium mb-1">
                🗑️ Eliminated Cards: {eliminatedCount}
              </div>
              <div className="text-xs">
                Positions eliminated: {eliminatedPositions.join(", ")}
              </div>
              <div className="text-xs mt-1">(These count as 0 points each)</div>
            </div>
          )}

          <p className="text-sm text-gray-300">
            Declare the rank of each remaining card in your hand:
          </p>

          {/* Only show inputs for actual cards */}
          <div className="space-y-3">
            {Array(actualCardCount)
              .fill(null)
              .map((_, index) => (
                <div
                  key={index}
                  className="space-y-1"
                >
                  <label className="block text-sm font-medium text-gray-300">
                    Remaining Card {index + 1}:
                  </label>
                  <select
                    value={declaredRanks[index]}
                    onChange={(e) => handleRankChange(index, e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select rank...</option>
                    {ranks.map((rank) => (
                      <option
                        key={rank}
                        value={rank}
                      >
                        {rank}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
          </div>

          {error && (
            <div className="p-3 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="text-xs text-gray-400">
            <p>
              <strong>Win Conditions:</strong>
            </p>
            <p>
              • <strong>Low score:</strong> Have the lowest total among all players
            </p>
            <p className="mt-2 text-sm text-gray-400">
              • Your total = sum of remaining cards + 0 for eliminated cards
            </p>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Declare ({actualCardCount} cards)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeclareModal;
