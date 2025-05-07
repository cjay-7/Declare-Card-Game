import { useState } from "react";
import { useGameContext } from "../contexts/GameContext";

interface LobbyProps {
  onJoinRoom: (roomId: string, playerName: string) => void;
}

const Lobby = ({ onJoinRoom }: LobbyProps) => {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const { setPlayerName } = useGameContext();

  const handleJoin = () => {
    if (!name || !roomId) return alert("Enter both name and room ID");
    
    setPlayerName(name);
    onJoinRoom(roomId, name);
  };

  const generateRandomRoomId = () => {
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(randomId);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 bg-gray-100">
      <h1 className="text-3xl font-bold">🎴 Declare - Game Lobby</h1>

      <input
        type="text"
        placeholder="Your Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="p-2 border rounded w-64"
      />
      
      <div className="flex w-64">
        <input
          type="text"
          placeholder="Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="p-2 border rounded w-full"
        />
        <button
          onClick={generateRandomRoomId}
          className="ml-2 px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
          title="Generate random room ID"
        >
          🎲
        </button>
      </div>

      <button
        onClick={handleJoin}
        className="px-4 py-2 font-semibold text-white bg-blue-500 rounded hover:bg-blue-600"
      >
        Join Game
      </button>
    </div>
  );
};

export default Lobby;