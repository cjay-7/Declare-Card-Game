// Updated App.tsx with auth routing
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import Lobby from "./components/Lobby";
import { GameBoard } from "./components/GameBoard";
import { GameProvider } from "./contexts/GameContext";
import { GameStateProvider } from "./contexts/GameStateContext";
import { UIStateProvider } from "./contexts/UIStateContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import TestControlPanel from "./TestControlPanel";
import GameInstructionsModal from "./components/GameInstructionsModal";
import KingPowerNotification from "./components/KingPowerNotification";
import NotificationSystem, {
  useNotifications,
} from "./components/NotificationSystem";
import socket from "./socket";

function GameApp() {
  const { user, loading, logout } = useAuth();
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [roomInfo, setRoomInfo] = useState({ roomId: "", playerName: "" });
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState(socket.getCurrentPlayer());

  const { notifications, addNotification, removeNotification } =
    useNotifications();

  // Listen for player switches (only in mock mode)
  useEffect(() => {
    const handlePlayerSwitch = (event: CustomEvent) => {
      if (socket.getMode() !== "mock") return;

      const { playerId } = event.detail;
      setCurrentPlayer(playerId);

      // Show notification of player switch
      addNotification({
        message: `Switched to ${
          playerId === "player1" ? "Player 1" : "Player 2"
        }`,
        type: "info",
        duration: 2000,
      });

      // If we're in a room, we might need to rejoin as the new player
      if (joinedRoom && roomInfo.roomId) {
        // Determine new player name based on player ID
        const newPlayerName = playerId === "player1" ? "Player 1" : "Player 2";

        // Update room info for the current player
        setRoomInfo((prev) => ({
          ...prev,
          playerName: newPlayerName,
        }));
      }
    };

    window.addEventListener(
      "player-switched",
      handlePlayerSwitch as EventListener
    );

    return () => {
      window.removeEventListener(
        "player-switched",
        handlePlayerSwitch as EventListener
      );
    };
  }, [joinedRoom, roomInfo.roomId, addNotification]);

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
    // In mock mode, modify player name to include player number
    // In real mode, use the player name provided
    let finalPlayerName = playerName;
    if (socket.getMode() === "mock") {
      const currentPlayerId = socket.getCurrentPlayer();
      finalPlayerName = currentPlayerId === "player1" ? "Player 1" : "Player 2";
    }

    setRoomInfo({ roomId, playerName: finalPlayerName });
    setJoinedRoom(true);

    // Show welcome notification
    addNotification({
      message: `${finalPlayerName} joined room ${roomId}`,
      type: "success",
      duration: 3000,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#262626]">
        <div className="text-white text-lg">Loading…</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <GameStateProvider initialCurrentPlayerId={currentPlayer}>
        <UIStateProvider>
          <GameProvider>
            {/* Player Switch Indicator - only show in mock mode */}
            {socket.getMode() === "mock" && (
              <div className="fixed top-20 right-4 z-40 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm">
                Playing as:{" "}
                <span className="font-bold text-blue-400">
                  {currentPlayer === "player1" ? "Player 1" : "Player 2"}
                </span>
              </div>
            )}

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

            {/* King Power Notification */}
            <KingPowerNotification />

            <Routes>
              {/* Public routes */}
              <Route
                path="/login"
                element={user ? <Navigate to="/lobby" replace /> : <Login />}
              />
              <Route
                path="/register"
                element={user ? <Navigate to="/lobby" replace /> : <Register />}
              />

              {/* Protected routes */}
              <Route
                path="/lobby"
                element={
                  user ? (
                    <Lobby onJoinRoom={handleJoinRoom} onLogout={logout} />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/game"
                element={
                  user && joinedRoom ? (
                    <GameBoard
                      key={`${roomInfo.roomId}-${currentPlayer}`}
                      initialRoomId={roomInfo.roomId}
                      initialPlayerName={roomInfo.playerName}
                    />
                  ) : (
                    <Navigate to={user ? "/lobby" : "/login"} replace />
                  )
                }
              />

              {/* 404 page */}
              <Route path="*" element={<NotFound />} />
            </Routes>

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
              className="fixed top-0 left-4 p-1 bg-transparent text-xs text-gray-500 opacity-30 hover:opacity-100"
              onClick={() => setShowTestPanel(!showTestPanel)}
            >
              {showTestPanel ? "Hide Test Panel" : "Show Test Panel (Alt+T)"}
            </button>

            {/* Mode info */}
            <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-lg text-xs max-w-sm opacity-80">
              {socket.getMode() === "mock" ? (
                <>
                  <div className="font-bold mb-1">2-Player Same Device Mode</div>
                  <div>• Use the player switcher (top right) to alternate</div>
                  <div>• Each player joins as "Player 1" or "Player 2"</div>
                </>
              ) : (
                <>
                  <div className="font-bold mb-1">Online Multiplayer Mode</div>
                  <div>• Share the room ID with another player</div>
                  <div>• Each player connects from their own device</div>
                </>
              )}
            </div>
          </GameProvider>
        </UIStateProvider>
      </GameStateProvider>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <GameApp />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
