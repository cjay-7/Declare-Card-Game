import React, { useEffect, useState } from "react";
import socket from "../socket";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

export const GameBoard: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerName, setPlayerName] = useState("🧑 jay");
  const [isHost, setIsHost] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const roomId = "room123"; // You can make this dynamic later

  useEffect(() => {
    socket.emit("join-room", { roomId, playerName });

    socket.on("update-players", (playersList: Player[]) => {
      setPlayers(playersList);
      const current = playersList.find(
        (p) => p.name === playerName && p.id === socket.id
      );
      setIsHost(current?.isHost || false);
    });

    socket.on("start-game", () => {
      setGameStarted(true);
    });

    return () => {
      socket.off("update-players");
      socket.off("start-game");
    };
  }, [playerName, roomId]);

  const handleStartGame = () => {
    socket.emit("start-game", { roomId });
  };

  return (
    <div className="p-6 text-white bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Waiting Room: {roomId}</h1>
      <h2 className="mb-4">You are: {playerName}</h2>

      <div className="mb-6">
        <h3 className="font-semibold mb-2">Players in Room:</h3>
        <ul className="space-y-1">
          {players.map((player) => (
            <li
              key={player.id}
              className="flex items-center"
            >
              <span>{player.name}</span>
              {player.isHost && (
                <span className="ml-2 text-yellow-400 text-sm">👑 Host</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isHost && !gameStarted && (
        <button
          onClick={handleStartGame}
          className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
        >
          Start Game
        </button>
      )}

      {gameStarted && (
        <div className="mt-6 text-yellow-400 text-lg">🎮 Game has started!</div>
      )}
    </div>
  );
};
