import React from 'react';

interface CardDeclarationSelectorProps {
  cardIndex: number;
  selectedRank: string;
  onRankSelect: (cardIndex: number, rank: string) => void;
  isEliminated: boolean;
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
  { value: 'K♠♣', label: 'K♠♣', points: 13 },
  { value: 'K♥♦', label: 'K♥♦', points: 0 },
];

export const CardDeclarationSelector: React.FC<CardDeclarationSelectorProps> = ({
  cardIndex,
  selectedRank,
  onRankSelect,
  isEliminated,
}) => {
  if (isEliminated) {
    return (
      <div className="w-20 h-28 bg-gray-800 border-2 border-dashed border-gray-600 rounded flex flex-col items-center justify-center">
        <span className="text-gray-500 text-xs mb-1">Eliminated</span>
        <span className="text-green-400 text-xs font-bold">0 pts</span>
      </div>
    );
  }

  const selectedOption = cardOptions.find(opt => opt.value === selectedRank);

  return (
    <div className="w-20 h-28 bg-gray-700 border-2 border-blue-400 rounded relative">
      {/* 14 button grid - 7 rows x 2 columns */}
      <div className="grid grid-cols-2 gap-0 h-full p-1">
        {cardOptions.map((option, index) => (
          <button
            key={option.value}
            onClick={() => onRankSelect(cardIndex, option.value)}
            className={`
              text-xs font-bold rounded transition-all duration-150
              ${selectedRank === option.value 
                ? 'bg-green-500 text-white shadow-lg scale-105' 
                : 'bg-gray-600 text-gray-200 hover:bg-gray-500 hover:text-white'
              }
              ${index % 2 === 0 ? 'mr-0.5' : 'ml-0.5'}
            `}
            style={{ 
              fontSize: '8px',
              minHeight: '16px',
              padding: '1px 2px'
            }}
          >
            <div>{option.label}</div>
            <div className="text-yellow-300" style={{ fontSize: '6px' }}>
              {option.points}pt
            </div>
          </button>
        ))}
      </div>

      {/* Selected card display at bottom */}
      {selectedOption && (
        <div className="absolute -bottom-6 left-0 right-0 bg-blue-600 text-white text-center py-1 rounded text-xs font-bold">
          {selectedOption.label} ({selectedOption.points} pts)
        </div>
      )}
    </div>
  );
};