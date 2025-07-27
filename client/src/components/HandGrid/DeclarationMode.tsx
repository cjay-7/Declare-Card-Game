import React, { useState } from 'react';
import type { Card } from '../../utils/cardUtils';
import { CardDeclarationSelector } from './CardDeclarationSelector';

interface DeclarationModeProps {
  cards: (Card | null)[];
  onConfirm: (declaredRanks: string[]) => void;
  onCancel: () => void;
}

export const DeclarationMode: React.FC<DeclarationModeProps> = ({
  cards,
  onConfirm,
  onCancel,
}) => {
  const [selectedRanks, setSelectedRanks] = useState<string[]>(new Array(4).fill(''));

  const handleRankSelect = (cardIndex: number, rank: string) => {
    const newRanks = [...selectedRanks];
    newRanks[cardIndex] = rank;
    setSelectedRanks(newRanks);
  };

  const actualCards = cards.filter(card => card !== null);
  const actualCardIndices = cards.map((card, index) => card !== null ? index : null).filter(i => i !== null) as number[];
  
  const canConfirm = actualCardIndices.every(index => selectedRanks[index] !== '');

  const calculateTotal = () => {
    const cardOptions = [
      { value: 'A', points: 1 }, { value: '2', points: 2 }, { value: '3', points: 3 },
      { value: '4', points: 4 }, { value: '5', points: 5 }, { value: '6', points: 6 },
      { value: '7', points: 7 }, { value: '8', points: 8 }, { value: '9', points: 9 },
      { value: '10', points: 10 }, { value: 'J', points: 11 }, { value: 'Q', points: 12 },
      { value: 'K♠♣', points: 13 }, { value: 'K♥♦', points: 0 },
    ];

    return actualCardIndices.reduce((total, index) => {
      const rank = selectedRanks[index];
      const option = cardOptions.find(opt => opt.value === rank);
      return total + (option?.points || 0);
    }, 0);
  };

  const handleConfirm = () => {
    if (!canConfirm) return;

    // Convert special K values back to just 'K' for the declaration
    const declaredRanks = actualCardIndices.map(index => {
      const rank = selectedRanks[index];
      return rank.startsWith('K') ? 'K' : rank;
    });

    onConfirm(declaredRanks);
  };

  return (
    <div className="relative pb-20">
      {/* Declaration header */}
      <div className="absolute -top-12 left-0 right-0 bg-blue-600 text-white text-center py-2 rounded-t-lg z-10">
        <div className="text-sm font-bold">🎯 Declare Your Hand</div>
        <div className="text-xs">Click buttons to select rank for each card</div>
      </div>

      {/* Card grid with selectors - more space needed for button grids */}
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto relative bg-blue-900 bg-opacity-30 p-6 rounded-lg border-2 border-blue-400 mb-8">
        {cards.map((card, index) => (
          <div key={index} className="flex justify-center mb-8">
            <CardDeclarationSelector
              cardIndex={index}
              selectedRank={selectedRanks[index]}
              onRankSelect={handleRankSelect}
              isEliminated={card === null}
            />
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="absolute -bottom-16 left-0 right-0 bg-blue-600 rounded-b-lg p-3 z-10">
        {canConfirm && (
          <div className="text-center mb-2">
            <span className="text-yellow-300 font-bold text-lg">Total: {calculateTotal()} points</span>
          </div>
        )}
        
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`flex-1 px-3 py-2 text-white text-sm rounded font-bold ${
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