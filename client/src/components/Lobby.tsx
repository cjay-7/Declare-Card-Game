import { useState } from "react";
import { useGameContext } from "../contexts/GameContext";
import GameInstructionsModal from "./GameInstructionsModal";
import socket from "../socket";

interface LobbyProps {
  onJoinRoom: (roomId: string, playerName: string) => void;
}

const Lobby = ({ onJoinRoom }: LobbyProps) => {
  const [roomId, setRoomId] = useState("");
  const [customPlayerName, setCustomPlayerName] = useState("");
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const { setPlayerName } = useGameContext();

  // Check socket mode
  const isMockMode = socket.getMode() === "mock";

  // Get current player from socket (only for mock mode)
  const currentPlayerId = socket.getCurrentPlayer();
  const mockPlayerName = currentPlayerId === "player1" ? "Player 1" : "Player 2";

  // Use mock player name in mock mode, custom name in real mode
  const playerName = isMockMode ? mockPlayerName : customPlayerName;

  const handleJoin = () => {
    if (!roomId) return alert("Please enter a room ID");
    if (!isMockMode && !customPlayerName.trim()) {
      return alert("Please enter your name");
    }

    setPlayerName(playerName);
    onJoinRoom(roomId, playerName);
  };

  const generateRandomRoomId = () => {
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(randomId);
  };

  const handleQuickStart = () => {
    if (!isMockMode && !customPlayerName.trim()) {
      return alert("Please enter your name");
    }

    const quickRoomId = "QUICK";
    setRoomId(quickRoomId);
    setPlayerName(playerName);
    onJoinRoom(quickRoomId, playerName);
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

        {/* Player Info - Mock Mode */}
        {isMockMode && (
          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <div className="text-center">
              <div className="text-lg font-semibold text-white mb-2">
                You are: <span className="text-blue-400">{mockPlayerName}</span>
              </div>
              <div className="text-sm text-gray-300">
                Use the player switcher (top right) to change players
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Player Name Input - Real Mode Only */}
          {!isMockMode && (
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
                value={customPlayerName}
                onChange={(e) => setCustomPlayerName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Choose a unique name to identify yourself
              </p>
            </div>
          )}

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

          <div className="flex flex-col space-y-3">
            <button
              onClick={handleJoin}
              disabled={!roomId || (!isMockMode && !customPlayerName.trim())}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isMockMode
                ? `Join Room as ${mockPlayerName}`
                : customPlayerName.trim()
                  ? `Join Room as ${customPlayerName}`
                  : "Join Room"
              }
            </button>

            <button
              onClick={handleQuickStart}
              disabled={!isMockMode && !customPlayerName.trim()}
              className="w-full py-3 bg-green-600 text-white font-semibold rounded hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Quick Start (Room: QUICK)
            </button>
          </div>

          <div className="pt-4 border-t border-gray-700">
            <button
              onClick={() => setIsInstructionsOpen(true)}
              className="w-full py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
            >
              How to Play
            </button>
          </div>
        </div>

        {/* Mode-specific Instructions */}
        <div className="mt-6 p-4 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-600">
          {isMockMode ? (
            <>
              <h3 className="text-sm font-bold text-blue-300 mb-2">
                2-Player Same Device Mode
              </h3>
              <ul className="text-xs text-blue-200 space-y-1">
                <li>• Both players use the same device</li>
                <li>
                  • Switch between "Player 1" and "Player 2" using the switcher
                </li>
                <li>
                  • Each player joins the same room with their respective name
                </li>
                <li>• Take turns and switch perspectives as needed</li>
              </ul>
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold text-blue-300 mb-2">
                Online Multiplayer Mode
              </h3>
              <ul className="text-xs text-blue-200 space-y-1">
                <li>• Enter your unique name</li>
                <li>• Create a room or join an existing one</li>
                <li>• Share the room ID with other players</li>
                <li>• Wait in the lobby for all players to join</li>
                <li>• Host starts the game when ready</li>
              </ul>
            </>
          )}
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
