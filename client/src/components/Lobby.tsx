import { useState } from "react";
import socket from "../socket";

const Lobby = () => {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");

  const handleJoin = () => {
    if (!name || !roomId) return alert("Enter both name and room ID");

    socket.emit("join-room", { name, roomId });
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
      <input
        type="text"
        placeholder="Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        className="p-2 border rounded w-64"
      />

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
