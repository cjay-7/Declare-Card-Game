import { useState } from "react";
import Lobby from "./components/Lobby";
import { GameBoard } from "./components/GameBoard";
import { GameProvider } from "./contexts/GameContext";
import TestControlPanel from "./TestControlPanel";

function App() {
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [roomInfo, setRoomInfo] = useState({ roomId: "", playerName: "" });
  const [showTestPanel, setShowTestPanel] = useState(true);

  const handleJoinRoom = (roomId: string, playerName: string) => {
    setRoomInfo({ roomId, playerName });
    setJoinedRoom(true);
  };

  return (
    <GameProvider>
      {!joinedRoom ? (
        <Lobby onJoinRoom={handleJoinRoom} />
      ) : (
        <GameBoard
          initialRoomId={roomInfo.roomId}
          initialPlayerName={roomInfo.playerName}
        />
      )}

      {/* Test Control Panel - toggle with Alt+T */}
      {showTestPanel && <TestControlPanel />}

      {/* Hidden button to toggle test panel */}
      <button
        className="fixed top-0 right-0 p-1 bg-transparent text-xs text-gray-500 opacity-30 hover:opacity-100"
        onClick={() => setShowTestPanel(!showTestPanel)}
      >
        {showTestPanel ? "Hide Test Panel" : "Show Test Panel"}
      </button>
    </GameProvider>
  );
}

export default App;
