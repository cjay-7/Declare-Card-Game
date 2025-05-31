// Updated App.tsx with PlayerContext
import { useState, useEffect } from "react";
import Lobby from "./components/Lobby";
import { GameBoard } from "./components/GameBoard";
import { GameProvider } from "./contexts/GameContext";
import { PlayerProvider } from "./contexts/PlayerContext";
import TestControlPanel from "./TestControlPanel";
import GameInstructionsModal from "./components/GameInstructionsModal";
import NotificationSystem, {
  useNotifications,
} from "./components/NotificationSystem";

function App() {
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [roomInfo, setRoomInfo] = useState({ roomId: "", playerName: "" });
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const { notifications, addNotification, removeNotification } =
    useNotifications();

  // Toggle test panel with Alt+T
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "t") {
        setShowTestPanel((prev) => !prev);
      } else if (e.altKey && e.key === "h") {
        setShowInstructions((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleJoinRoom = (roomId: string, playerName: string) => {
    setRoomInfo({ roomId, playerName });
    setJoinedRoom(true);

    // Show welcome notification
    addNotification({
      message: `Welcome to room ${roomId}`,
      type: "success",
      duration: 3000,
    });
  };

  return (
    <PlayerProvider>
      <GameProvider>
        {/* Notification System */}
        <NotificationSystem
          notifications={notifications}
          removeNotification={removeNotification}
        />

        {/* Game Instructions Modal */}
        <GameInstructionsModal
          isOpen={showInstructions}
          onClose={() => setShowInstructions(false)}
        />

        {/* Main Content */}
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

        {/* Help button */}
        <button
          className="fixed bottom-4 left-4 bg-gray-700 text-white p-2 rounded-full shadow-lg hover:bg-gray-600 transition-colors"
          onClick={() => setShowInstructions(true)}
          title="Game Instructions (Alt+H)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>

        {/* Test panel toggle button */}
        <button
          className="fixed top-0 right-0 p-1 bg-transparent text-xs text-gray-500 opacity-30 hover:opacity-100"
          onClick={() => setShowTestPanel(!showTestPanel)}
          style={{ top: 0 }}
        >
          {showTestPanel ? "Hide Test Panel" : "Show Test Panel"}
        </button>
      </GameProvider>
    </PlayerProvider>
  );
}

export default App;
