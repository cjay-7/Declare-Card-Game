// client/src/TestControlPanel.tsx
import React, { useState, useEffect } from "react";
import socket from "./socket";
import MockSocket from "./utils/MockSocket";
import type { GameState } from "./utils/gameLogic";

// This component is for testing purposes only - to simulate multiple players
const TestControlPanel: React.FC = () => {
  const [newPlayerName, setNewPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [botSockets, setBotSockets] = useState<
    { socket: MockSocket; id: string; name: string }[]
  >([]);

  // Listen for game state updates
  useEffect(() => {
    const handleGameStateUpdate = (updatedState: GameState) => {
      console.log("Test panel received game state update:", updatedState);
      setGameState(updatedState);

      // Make sure room ID is set from game state
      if (updatedState && !roomId) {
        // Try to find room ID from somewhere in the game state
        const possibleRoomId = document
          .querySelector("h1")
          ?.textContent?.replace("Room: ", "");
        if (possibleRoomId) {
          console.log("Setting room ID from DOM:", possibleRoomId);
          setRoomId(possibleRoomId);
        }
      }
    };

    socket.on("game-state-update", handleGameStateUpdate);

    return () => {
      socket.off("game-state-update", handleGameStateUpdate);
    };
  }, [roomId]);

  // Add a bot player to the current room
  const addBotPlayer = () => {
    if (!newPlayerName || !roomId) {
      alert("Please enter a bot name and room ID");
      return;
    }

    // Create a new bot socket
    const botSocket = new MockSocket();
    const botId = `bot-${Math.random().toString(36).substring(2, 9)}`;
    botSocket.setId(botId);

    // Add to state
    setBotSockets([
      ...botSockets,
      {
        socket: botSocket,
        id: botId,
        name: newPlayerName,
      },
    ]);

    // Join room as a bot
    botSocket.emit("join-room", {
      roomId,
      playerName: `🤖 ${newPlayerName}`,
    });

    setNewPlayerName("");
  };

  // Add random players
  const addRandomPlayers = (count: number) => {
    if (!roomId) {
      alert("Please enter a room ID first");
      return;
    }

    const names = [
      "Alice",
      "Bob",
      "Charlie",
      "Dave",
      "Eve",
      "Frank",
      "Grace",
      "Hank",
    ];

    const newBots = [];

    for (let i = 0; i < count; i++) {
      if (i < names.length) {
        const botSocket = new MockSocket();
        const botId = `bot-${Math.random().toString(36).substring(2, 9)}`;
        botSocket.setId(botId);

        // Join room
        botSocket.emit("join-room", {
          roomId,
          playerName: `🤖 ${names[i]}`,
        });

        newBots.push({
          socket: botSocket,
          id: botId,
          name: names[i],
        });
      }
    }

    setBotSockets([...botSockets, ...newBots]);
  };

  // Simulate actions for a specific player
  const simulateAction = (
    botSocket: MockSocket,
    botId: string,
    action: string
  ) => {
    if (!gameState || !roomId) {
      alert("Game not started yet");
      return;
    }

    switch (action) {
      case "draw":
        console.log(`Bot ${botId} is drawing a card`);
        botSocket.emit("draw-card", {
          roomId,
          playerId: botId,
        });
        break;

      case "discard":
        // Find bot player in game state
        const player = gameState.players.find((p) => p.id === botId);
        if (player && player.hand.length > 0) {
          console.log(`Bot ${botId} is discarding card ${player.hand[0].id}`);
          botSocket.emit("discard-card", {
            roomId,
            playerId: botId,
            cardId: player.hand[0].id,
          });
        } else {
          console.log(`Bot ${botId} has no cards to discard`);
        }
        break;

      case "declare":
        console.log(`Bot ${botId} is declaring`);
        botSocket.emit("declare", {
          roomId,
          playerId: botId,
        });
        break;
    }
  };

  // Start game
  const startGameTest = () => {
    if (!roomId) {
      alert("Please enter a room ID first");
      return;
    }

    console.log("Starting game in room:", roomId);
    socket.emit("start-game", { roomId });
  };

  return (
    <div
      className={`fixed bottom-0 left-0 p-4 bg-gray-800 border border-gray-700 rounded-tr-lg z-50 text-white transition-all ${
        expanded ? "w-80" : "w-10"
      }`}
    >
      {/* Toggle button */}
      <button
        className="absolute top-2 right-2 text-xs text-gray-400 hover:text-white"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "◀" : "▶"}
      </button>

      {expanded ? (
        <>
          <h3 className="text-sm font-bold mb-2">Test Control Panel</h3>

          <div className="mb-3">
            <p className="text-xs">Room Configuration:</p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded"
              />
              <button
                onClick={startGameTest}
                className="px-2 py-1 text-xs bg-green-600 rounded hover:bg-green-700"
              >
                Start Game
              </button>
            </div>
          </div>

          <div className="mb-3">
            <p className="text-xs">Add Bot Player:</p>
            <div className="flex gap-2 mb-2">
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
            <div className="flex gap-2">
              <button
                onClick={() => addRandomPlayers(1)}
                className="px-2 py-1 text-xs bg-blue-600 rounded hover:bg-blue-700"
              >
                +1 Random
              </button>
              <button
                onClick={() => addRandomPlayers(3)}
                className="px-2 py-1 text-xs bg-blue-600 rounded hover:bg-blue-700"
              >
                +3 Random
              </button>
            </div>
          </div>

          {gameState && gameState.players && gameState.players.length > 0 && (
            <div>
              <p className="text-xs mb-1">Players:</p>
              {gameState.players.map((player, index) => {
                const botInfo = botSockets.find((b) => b.id === player.id);
                return (
                  <div
                    key={player.id}
                    className="flex items-center gap-1 mb-1"
                  >
                    <span
                      className={`text-xs ${
                        gameState.currentPlayerIndex === index
                          ? "text-yellow-400"
                          : ""
                      }`}
                    >
                      {player.name}
                      {gameState.currentPlayerIndex === index ? " (Turn)" : ""}
                    </span>
                    {botInfo && (
                      <>
                        <button
                          onClick={() =>
                            simulateAction(botInfo.socket, botInfo.id, "draw")
                          }
                          className="px-1 py-0.5 text-xs bg-blue-600 rounded hover:bg-blue-700"
                          disabled={gameState.currentPlayerIndex !== index}
                        >
                          Draw
                        </button>
                        <button
                          onClick={() =>
                            simulateAction(
                              botInfo.socket,
                              botInfo.id,
                              "discard"
                            )
                          }
                          className="px-1 py-0.5 text-xs bg-red-600 rounded hover:bg-red-700"
                          disabled={gameState.currentPlayerIndex !== index}
                        >
                          Discard
                        </button>
                        <button
                          onClick={() =>
                            simulateAction(
                              botInfo.socket,
                              botInfo.id,
                              "declare"
                            )
                          }
                          className="px-1 py-0.5 text-xs bg-green-600 rounded hover:bg-green-700"
                          disabled={gameState.currentPlayerIndex !== index}
                        >
                          Declare
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs mt-2 text-gray-400">
            This panel is for testing only
          </p>
        </>
      ) : (
        <span className="text-xs text-gray-400 transform -rotate-90 inline-block mt-10">
          Test Panel
        </span>
      )}
    </div>
  );
};

export default TestControlPanel;
