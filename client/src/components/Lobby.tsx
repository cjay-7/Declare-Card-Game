import { useState } from "react";
import { useGameContext } from "../contexts/GameContext";
import GameInstructionsModal from "./GameInstructionsModal";

interface LobbyProps {
  onJoinRoom: (roomId: string, playerName: string) => void;
}

const Lobby = ({ onJoinRoom }: LobbyProps) => {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const { setPlayerName } = useGameContext();

  const handleJoin = () => {
    if (!name) return alert("Please enter your name");
    if (!roomId) return alert("Please enter a room ID");

    setPlayerName(name);
    onJoinRoom(roomId, name);
  };

  const generateRandomRoomId = () => {
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(randomId);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 p-4">
      <div className="bg-gray-800 shadow-lg rounded-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🎴 Declare</h1>
          <p className="text-gray-300">
            A multiplayer card game of strategy and luck
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="playerName"
              className="block text-gray-300 mb-1"
            >
              Your Name
            </label>
            <input
              id="playerName"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="roomId"
              className="block text-gray-300 mb-1"
            >
              Room ID
            </label>
            <div className="flex">
              <input
                id="roomId"
                type="text"
                placeholder="Enter room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={generateRandomRoomId}
                className="px-4 py-2 bg-gray-600 text-white rounded-r hover:bg-gray-500 transition-colors"
                title="Generate random room ID"
              >
                🎲
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Create a new room or join an existing one
            </p>
          </div>

          <button
            onClick={handleJoin}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition-colors"
          >
            Join Game
          </button>

          <div className="pt-4 border-t border-gray-700">
            <button
              onClick={() => setIsInstructionsOpen(true)}
              className="w-full py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
            >
              How to Play
            </button>
          </div>
        </div>
      </div>

      <GameInstructionsModal
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
      />
    </div>
  );
};

export default Lobby;
