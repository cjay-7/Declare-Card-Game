import React, { useState } from 'react';
import type { Card } from '../utils/cardUtils';

interface InlineCardDeclarationProps {
  playerHand: (Card | null)[];
  onConfirm: (declaredRanks: string[]) => void;
  onCancel: () => void;
}

const cardOptions = [
  { value: 'A', label: 'A', points: 1 },
  { value: '2', label: '2', points: 2 },
  { value: '3', label: '3', points: 3 },
  { value: '4', label: '4', points: 4 },
  { value: '5', label: '5', points: 5 },
  { value: '6', label: '6', points: 6 },
  { value: '7', label: '7', points: 7 },
  { value: '8', label: '8', points: 8 },
  { value: '9', label: '9', points: 9 },
  { value: '10', label: '10', points: 10 },
  { value: 'J', label: 'J', points: 11 },
  { value: 'Q', label: 'Q', points: 12 },
  { value: 'K♠/♣', label: 'K♠/♣', points: 13 },
  { value: 'K♥/♦', label: 'K♥/♦', points: 0 },
];

export const InlineCardDeclaration: React.FC<InlineCardDeclarationProps> = ({
  playerHand,
  onConfirm,
  onCancel,
}) => {
  const actualCards = playerHand.filter((card): card is Card => card !== null);
  const [selectedRanks, setSelectedRanks] = useState<string[]>(new Array(actualCards.length).fill(''));
  const [error, setError] = useState('');

  const handleRankSelect = (cardIndex: number, rank: string) => {
    const newRanks = [...selectedRanks];
    newRanks[cardIndex] = rank;
    setSelectedRanks(newRanks);
    setError('');
  };

  const calculateTotal = () => {
    return selectedRanks.reduce((total, rank) => {
      const option = cardOptions.find(opt => opt.value === rank);
      return total + (option?.points || 0);
    }, 0);
  };

  const canConfirm = selectedRanks.every(rank => rank !== '');

  const handleConfirm = () => {
    if (!canConfirm) {
      setError('Please select a rank for each card');
      return;
    }

    // Convert K♠/♣ and K♥/♦ back to just K for the declaration
    const declaredRanks = selectedRanks.map(rank => 
      rank.startsWith('K') ? 'K' : rank
    );

    onConfirm(declaredRanks);
  };

  const eliminatedCount = playerHand.filter(card => card === null).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white mb-2">Declare Your Hand</h2>
          <p className="text-gray-300 text-sm">Select the rank for each of your remaining cards:</p>
        </div>

        {/* Show eliminated cards info */}
        {eliminatedCount > 0 && (
          <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded text-red-200">
            <div className="text-sm font-medium mb-1">
              🗑️ Eliminated Cards: {eliminatedCount}
            </div>
            <div className="text-xs">These count as 0 points each</div>
          </div>
        )}

        {/* Card Declaration Grid */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
          {actualCards.map((card, index) => {
            const cardPosition = playerHand.findIndex((c, i) => c === card);
            return (
              <div key={`card-${cardPosition}`} className="relative">
                {/* Card Visual */}
                <div className="w-20 h-28 bg-gray-700 rounded-lg border-2 border-gray-600 flex items-center justify-center mb-2">
                  <div className="text-center">
                    <div className="text-white text-lg font-bold">?</div>
                    <div className="text-xs text-gray-400">Card {cardPosition + 1}</div>
                  </div>
                </div>

                {/* Dropdown Selector */}
                <div className="relative">
                  <select
                    value={selectedRanks[index]}
                    onChange={(e) => handleRankSelect(index, e.target.value)}
                    className="w-full p-2 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select rank...</option>
                    {cardOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} ({option.points} pts)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected indicator */}
                {selectedRanks[index] && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    ✓
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Total Score Preview */}
        {canConfirm && (
          <div className="mb-4 p-3 bg-blue-900 bg-opacity-50 border border-blue-600 rounded text-center">
            <div className="text-blue-200 text-sm">
              Your declared total: <span className="font-bold text-lg">{calculateTotal()}</span> points
            </div>
            <div className="text-xs text-blue-300 mt-1">
              (Including {eliminatedCount} eliminated cards = 0 pts each)
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        {/* Win Conditions Info */}
        <div className="mb-4 p-3 bg-gray-700 rounded text-gray-300 text-xs">
          <div className="font-medium mb-1">Win Conditions:</div>
          <div>• Have the lowest total among all players</div>
          <div>• Your total = sum of declared cards + 0 for eliminated cards</div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`flex-1 px-4 py-2 text-white rounded transition-colors ${
              canConfirm 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-gray-500 cursor-not-allowed'
            }`}
          >
            Declare ({actualCards.length} cards)
          </button>
        </div>
      </div>
    </div>
  );
};