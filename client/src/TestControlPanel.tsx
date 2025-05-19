// client/src/TestControlPanel.tsx
import React, { useState } from "react";
import socket from "./socket";
import MockSocket from "./utils/MockSocket";

// This component is for testing purposes only - to simulate multiple players
const TestControlPanel: React.FC = () => {
  const [newPlayerName, setNewPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [botPlayers, setBotPlayers] = useState<{ name: string; id: string }[]>(
    []
  );

  const addBotPlayer = () => {
    if (!newPlayerName || !roomId) return;

    // Create mock connection for bot player
    const botSocket = new MockSocket();
    const botId = `bot-${Math.random().toString(36).substring(2, 9)}`;

    // Join room
    botSocket.emit("join-room", {
      roomId,
      playerName: newPlayerName,
    });

    // Add to list
    setBotPlayers([...botPlayers, { name: newPlayerName, id: botId }]);
    setNewPlayerName("");
  };

  const botAction = (action: string, botIndex: number) => {
    const bot = botPlayers[botIndex];
    if (!bot) return;

    // For demo purposes, just make a random action
    switch (action) {
      case "draw":
        socket.emit("draw-card", { roomId, playerId: bot.id });
        break;
      case "discard":
        // Just discard the first card in hand
        socket.emit("discard-card", { roomId, playerId: bot.id, cardId: "0" });
        break;
      case "declare":
        socket.emit("declare", { roomId, playerId: bot.id });
        break;
    }
  };

  return (
    <div className="fixed bottom-0 left-0 p-4 bg-gray-800 border border-gray-700 rounded-tr-lg z-50 text-white">
      <h3 className="text-sm font-bold mb-2">Test Control Panel</h3>

      <div className="mb-2">
        <p className="text-xs">Add bot players to test multiplayer:</p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded"
          />
          <input
            type="text"
            placeholder="Bot Name"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            className="px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded"
          />
          <button
            onClick={addBotPlayer}
            className="px-2 py-1 text-xs bg-blue-600 rounded hover:bg-blue-700"
          >
            Add Bot
          </button>
        </div>
      </div>

      {botPlayers.length > 0 && (
        <div>
          <p className="text-xs mb-1">Bot Players:</p>
          {botPlayers.map((bot, index) => (
            <div
              key={bot.id}
              className="flex items-center gap-1 mb-1"
            >
              <span className="text-xs">{bot.name}</span>
              <button
                onClick={() => botAction("draw", index)}
                className="px-1 py-0.5 text-xs bg-blue-600 rounded hover:bg-blue-700"
              >
                Draw
              </button>
              <button
                onClick={() => botAction("discard", index)}
                className="px-1 py-0.5 text-xs bg-red-600 rounded hover:bg-red-700"
              >
                Discard
              </button>
              <button
                onClick={() => botAction("declare", index)}
                className="px-1 py-0.5 text-xs bg-green-600 rounded hover:bg-green-700"
              >
                Declare
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs mt-2 text-gray-400">
        This panel is for testing only
      </p>
    </div>
  );
};

export default TestControlPanel;
