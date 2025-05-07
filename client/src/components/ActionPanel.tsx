import React from "react";

interface ActionPanelProps {
  isPlayerTurn: boolean;
  onDraw: () => void;
  onSwap: () => void;
  onDiscard: () => void;
  onDeclare: () => void;
}

const ActionPanel: React.FC<ActionPanelProps> = ({
  isPlayerTurn,
  onDraw,
  onSwap,
  onDiscard,
  onDeclare,
}) => {
  if (!isPlayerTurn) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg">
        <p className="text-center text-gray-400">Waiting for your turn...</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h3 className="text-center mb-2 font-semibold text-white">Your Turn</h3>
      <div className="flex justify-center gap-2">
        <button
          onClick={onDraw}
          className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-white"
        >
          Draw
        </button>
        <button
          onClick={onSwap}
          className="px-3 py-1 bg-yellow-600 rounded hover:bg-yellow-700 text-white"
        >
          Swap
        </button>
        <button
          onClick={onDiscard}
          className="px-3 py-1 bg-red-600 rounded hover:bg-red-700 text-white"
        >
          Discard
        </button>
        <button
          onClick={onDeclare}
          className="px-3 py-1 bg-green-600 rounded hover:bg-green-700 text-white"
        >
          Declare
        </button>
      </div>
    </div>
  );
};

export default ActionPanel;