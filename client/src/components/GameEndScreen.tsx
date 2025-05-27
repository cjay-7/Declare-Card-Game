import React, { useEffect, useState } from "react";
import { useGameContext } from "../contexts/GameContext";
import Card from "./Card";

interface GameEndScreenProps {
  onPlayAgain: () => void;
}

const GameEndScreen: React.FC<GameEndScreenProps> = ({ onPlayAgain }) => {
  const { gameState, myPlayer } = useGameContext();
  const [winners, setWinners] = useState<string[]>([]);

  useEffect(() => {
    if (gameState?.gameStatus === "ended" && gameState.players.length > 0) {
      // Find minimum score
      const minScore = Math.min(...gameState.players.map((p) => p.score));

      // Get all players with the minimum score (in case of tie)
      const winnerIds = gameState.players
        .filter((p) => p.score === minScore)
        .map((p) => p.id);

      setWinners(winnerIds);
    }
  }, [gameState]);

  if (!gameState || gameState.gameStatus !== "ended") {
    return null;
  }

  const getPlayerById = (id: string) => {
    return gameState.players.find((p) => p.id === id);
  };

  const sortedPlayers = [...gameState.players].sort(
    (a, b) => a.score - b.score
  );
  const declarer = getPlayerById(gameState.declarer || "");
  const isDeclareValid = declarer && winners.includes(declarer.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-6em font-bold text-white text-center mb-6">
          Game Over
        </h2>

        {/* Declare Status */}
        {declarer && (
          <div
            className={`mb-6 p-3 rounded-lg text-center ${
              isDeclareValid ? "bg-green-700" : "bg-red-700"
            }`}
          >
            <p className="text-white">
              {declarer.name} declared and {isDeclareValid ? "won!" : "lost!"}
            </p>
          </div>
        )}

        {/* Winners Section */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white mb-2">
            {winners.length > 1 ? "Winners" : "Winner"}
          </h3>
          <div className="flex flex-wrap gap-2">
            {winners.map((winnerId) => {
              const winner = getPlayerById(winnerId);
              return winner ? (
                <div
                  key={winnerId}
                  className={`p-3 bg-yellow-600 rounded-lg flex items-center gap-2 
                            ${
                              winner.id === myPlayer?.id
                                ? "border-2 border-white"
                                : ""
                            }`}
                >
                  <div className="w-8 h-8 bg-yellow-800 rounded-full flex items-center justify-center">
                    {winner.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-white">{winner.name}</p>
                    <p className="text-yellow-100 text-sm">
                      Score: {winner.score}
                    </p>
                  </div>
                </div>
              ) : null;
            })}
          </div>
        </div>

        {/* Results Table */}
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-white">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="py-2 px-4 text-left">Rank</th>
                <th className="py-2 px-4 text-left">Player</th>
                <th className="py-2 px-4 text-left">Score</th>
                <th className="py-2 px-4 text-left">Hand</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player, index) => (
                <tr
                  key={player.id}
                  className={`border-b border-gray-700 
                            ${
                              player.id === myPlayer?.id
                                ? "bg-blue-900 bg-opacity-40"
                                : ""
                            }`}
                >
                  <td className="py-2 px-4">{index + 1}</td>
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-xs">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      {player.name}
                      {player.id === myPlayer?.id && (
                        <span className="text-xs text-blue-300">(You)</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-4">{player.score}</td>
                  <td className="py-2 px-4">
                    <div className="flex space-x-1">
                      {player.hand.map((card, cardIndex) => (
                        <div
                          key={cardIndex}
                          className="transform scale-75 origin-left"
                        >
                          <Card
                            suit={card.suit}
                            rank={card.rank}
                            isRevealed={true}
                          />
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex justify-center">
          <button
            onClick={onPlayAgain}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameEndScreen;
