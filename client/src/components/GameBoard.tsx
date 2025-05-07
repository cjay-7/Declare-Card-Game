import React, { useEffect, useState } from "react";
import socket from "../socket";
import PlayersList from "./PlayerList";
import Card from "./Card";
import { useGameContext } from "../contexts/GameContext";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface GameBoardProps {
  initialRoomId: string;
  initialPlayerName: string;
}

export const GameBoard: React.FC<GameBoardProps> = ({ initialRoomId, initialPlayerName }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [roomId] = useState(initialRoomId);
  const [playerName] = useState(initialPlayerName);
  const { setPlayerName } = useGameContext();

  useEffect(() => {
    setPlayerName(playerName);
    
    // Join the room
    socket.emit("join-room", { roomId, playerName });

    // Listen for player updates
    socket.on("update-players", (playersList: Player[]) => {
      setPlayers(playersList);
      const current = playersList.find(
        (p) => p.id === socket.id
      );
      setIsHost(current?.isHost || false);
    });

    // Listen for game start
    socket.on("start-game", () => {
      setGameStarted(true);
    });

    // Cleanup on unmount
    return () => {
      socket.off("update-players");
      socket.off("start-game");
    };
  }, [playerName, roomId, setPlayerName]);

  const handleStartGame = () => {
    socket.emit("start-game", { roomId });
  };

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Room: {roomId}</h1>
            <h2 className="text-lg">You: {playerName}</h2>
          </div>
          <div>
            {isHost && !gameStarted && (
              <button
                onClick={handleStartGame}
                className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
              >
                Start Game
              </button>
            )}
          </div>
        </div>

        <PlayersList players={players} />

        {gameStarted ? (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Game Board</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-center mb-2">Deck</h3>
                <div className="flex justify-center">
                  <div className="w-16 h-24 bg-blue-500 border border-blue-700 rounded shadow">
                    <div className="flex justify-center items-center h-full">
                      <span className="text-white">🎴</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-center mb-2">Discard Pile</h3>
                <div className="flex justify-center">
                  <div className="w-16 h-24 bg-gray-700 border border-gray-600 rounded shadow">
                    <div className="flex justify-center items-center h-full">
                      <span>Empty</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-center mb-2">Your Hand</h3>
                <div className="flex justify-center gap-2">
                  <Card />
                  <Card />
                  <Card />
                  <Card />
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <h3 className="text-center mb-2">Actions</h3>
              <div className="flex justify-center gap-2">
                <button className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700">
                  Draw
                </button>
                <button className="px-3 py-1 bg-yellow-600 rounded hover:bg-yellow-700">
                  Swap
                </button>
                <button className="px-3 py-1 bg-red-600 rounded hover:bg-red-700">
                  Discard
                </button>
                <button className="px-3 py-1 bg-green-600 rounded hover:bg-green-700">
                  Declare
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 p-6 bg-gray-800 rounded-lg text-center">
            <h2 className="text-xl font-bold mb-2">Waiting for host to start the game...</h2>
            <p>Players: {players.length}/8</p>
          </div>
        )}
      </div>
    </div>
  );
};