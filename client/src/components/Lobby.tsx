import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameContext } from "../contexts/GameContext";
import { useAuth } from "../contexts/AuthContext";
import GameInstructionsModal from "./GameInstructionsModal";
import socket from "../socket";

interface LobbyProps {
  onJoinRoom: (roomId: string, playerName: string) => void;
  onLogout: () => void;
}

const Lobby = ({ onJoinRoom, onLogout }: LobbyProps) => {
  const [roomId, setRoomId] = useState("");
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const { setPlayerName } = useGameContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check socket mode
  const isMockMode = socket.getMode() === "mock";

  // Get current player from socket (only for mock mode)
  const currentPlayerId = socket.getCurrentPlayer();
  const mockPlayerName = currentPlayerId === "player1" ? "Player 1" : "Player 2";

  // Use mock player name in mock mode, user's displayName in real mode
  const playerName = isMockMode ? mockPlayerName : (user?.displayName ?? "");

  const handleJoin = () => {
    if (!roomId) return alert("Please enter a room ID");
    setPlayerName(playerName);
    onJoinRoom(roomId, playerName);
    navigate("/game");
  };

  const generateRandomRoomId = () => {
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(randomId);
  };

  const handleQuickStart = () => {
    const quickRoomId = "QUICK";
    setRoomId(quickRoomId);
    setPlayerName(playerName);
    onJoinRoom(quickRoomId, playerName);
    navigate("/game");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#262626] p-4">
      <div className="bg-gray-800 shadow-lg rounded-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🎴 Declare</h1>
          <p className="text-gray-300">
            A multiplayer card game of strategy and luck
          </p>
        </div>

        {/* Player Info */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400">Playing as</div>
            <div className="text-lg font-semibold text-white">{playerName}</div>
          </div>
          {!isMockMode && (
            <button
              onClick={onLogout}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign out
            </button>
          )}
          {isMockMode && (
            <div className="text-xs text-gray-400">Use switcher (top right)</div>
          )}
        </div>

        <div className="space-y-4">

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
              disabled={!roomId}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {`Join Room as ${playerName}`}
            </button>

            <button
              onClick={handleQuickStart}
              className="w-full py-3 bg-green-600 text-white font-semibold rounded hover:bg-green-700 transition-colors"
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
