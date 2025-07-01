// components/DeclareModal.tsx - Updated to handle eliminated cards
import React, { useState } from "react";
import { useGameContext } from "../contexts/GameContext";

interface DeclareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cardRanks: string[]) => void;
}

const DeclareModal: React.FC<DeclareModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { gameState, myPlayer } = useGameContext();
  const [selectedRanks, setSelectedRanks] = useState<string[]>([]);
  const [error, setError] = useState<string>("");

  if (!isOpen || !myPlayer) return null;

  // Filter out eliminated cards (null values) to get actual remaining cards
  const actualCards = myPlayer.hand.filter(card => card !== null);
  const actualCardCount = actualCards.length;

  const cardRanks = [
    "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"
  ];

  const handleRankSelect = (rank: string, position: number) => {
    const newRanks = [...selectedRanks];
    newRanks[position] = rank;
    setSelectedRanks(newRanks);
    setError("");
  };

  const handleConfirm = () => {
    // Validate that all positions are filled
    if (selectedRanks.length !== actualCardCount || selectedRanks.some(rank => !rank)) {
      setError(`You must select ranks for all ${actualCardCount} remaining cards`);
      return;
    }

    onConfirm(selectedRanks);
    setSelectedRanks([]);
    setError("");
  };

  const handleClose = () => {
    setSelectedRanks([]);
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Declare Your Cards
          </h2>
          
          <div className="text-sm text-gray-300 mb-4">
            <p>You have <strong>{actualCardCount}</strong> remaining cards to declare</p>
            <p className="text-xs text-gray-400 mt-1">
              (Eliminated cards don't need to be declared)
            </p>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-2">
              Select the rank of each of your remaining cards in order:
            </p>
            
            {/* Show current hand state */}
            <div className="mb-4 p-2 bg-gray-700 rounded">
              <div className="text-xs text-gray-400 mb-1">Your hand positions:</div>
              <div className="flex justify-center gap-1">
                {myPlayer.hand.map((card, index) => (
                  <div 
                    key={index}
                    className={`w-8 h-12 rounded border-2 flex items-center justify-center text-xs ${
                      card === null 
                        ? "border-gray-500 bg-gray-600 text-gray-400" 
                        : "border-blue-400 bg-blue-900 text-white"
                    }`}
                  >
                    {card === null ? "❌" : (index + 1)}
                  </div>
                ))}
              </div>
            </div>

            {/* Rank selection for each remaining card */}
            <div className="space-y-3">
              {Array.from({ length: actualCardCount }).map((_, position) => (
                <div key={position} className="border border-gray-600 rounded p-3">
                  <div className="text-sm text-gray-300 mb-2">
                    Card {position + 1} rank:
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {cardRanks.map((rank) => (
                      <button
                        key={rank}
                        onClick={() => handleRankSelect(rank, position)}
                        className={`px-2 py-1 text-xs rounded border ${
                          selectedRanks[position] === rank
                            ? "bg-blue-600 text-white border-blue-400"
                            : "bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600"
                        }`}
                      >
                        {rank}
                      </button>
                    ))}
                  </div>
                  {selectedRanks[position] && (
                    <div className="text-xs text-green-400 mt-1">
                      Selected: {selectedRanks[position]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Show current selection */}
          {selectedRanks.length > 0 && (
            <div className="mb-4 p-2 bg-blue-900 rounded">
              <div className="text-xs text-blue-300 mb-1">Your declaration:</div>
              <div className="text-white font-mono">
                [{selectedRanks.join(", ")}]
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-2 bg-red-900 border border-red-600 rounded text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="text-xs text-gray-400">
            <p>
              <strong>Scoring:</strong>
            </p>
            <p>
              • Your total = sum of remaining cards + 0 for eliminated cards
            </p>
            <p>• Win condition: Have the lowest total among all players</p>
            {actualCardCount === 4 && (
              <>
                <p className="mt-2">
                  <strong>Bonus win conditions (4 cards only):</strong>
                </p>
                <p>
                  • <strong>Set:</strong> All 4 cards same rank (e.g., 4 Aces)
                </p>
                <p>
                  • <strong>Sequence:</strong> 4 consecutive ranks of same suit
                  (e.g., 5-6-7-8 of Hearts)
                </p>
              </>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleClose}
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