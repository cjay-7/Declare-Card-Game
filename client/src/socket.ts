// client/src/socket.ts - Final simple solution
import DualPlayerMockSocket from "./utils/DualPlayerMockSocket";

// Global player state
let currentPlayerId = "player1";

// Create socket that switches based on current player
const socket = {
  getId: () => currentPlayerId,

  emit: (event: string, data?: any) => {
    return DualPlayerMockSocket.getInstance(currentPlayerId).emit(event, data);
  },

  on: (event: string, listener: (...args: any[]) => void) => {
    return DualPlayerMockSocket.getInstance(currentPlayerId).on(
      event,
      listener
    );
  },

  off: (event: string, listener: (...args: any[]) => void) => {
    DualPlayerMockSocket.getInstance("player1").off(event, listener);
    DualPlayerMockSocket.getInstance("player2").off(event, listener);
    return socket;
  },

  // Helper to switch players
  switchToPlayer: (playerId: "player1" | "player2") => {
    currentPlayerId = playerId;
    console.log(`🔄 Switched to ${playerId}`);

    // Force re-render by dispatching event
    window.dispatchEvent(
      new CustomEvent("player-switched", {
        detail: { playerId },
      })
    );
  },

  getCurrentPlayer: () => currentPlayerId,
};

// Add simple switcher UI
setTimeout(() => {
  if (document.getElementById("switcher")) return;

  const div = document.createElement("div");
  div.id = "switcher";
  div.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 9999;
    background: rgba(0,0,0,0.9);
    color: white;
    padding: 12px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
  `;

  const update = () => {
    div.innerHTML = `
      <div style="font-weight:bold;margin-bottom:8px;text-align:center;">🎮 Player Switch</div>
      <div style="margin-bottom:8px;text-align:center;font-size:12px;">
        Current: <span style="color:${
          currentPlayerId === "player1" ? "#3b82f6" : "#10b981"
        };">
          ${currentPlayerId === "player1" ? "Player 1" : "Player 2"}
        </span>
      </div>
      <div style="display:flex;gap:8px;">
        <button onclick="window.switchToPlayer1()" style="
          padding:6px 12px;border:none;border-radius:4px;
          background:${currentPlayerId === "player1" ? "#3b82f6" : "#4b5563"};
          color:white;cursor:pointer;font-size:12px;
        ">Player 1</button>
        <button onclick="window.switchToPlayer2()" style="
          padding:6px 12px;border:none;border-radius:4px;
          background:${currentPlayerId === "player2" ? "#10b981" : "#4b5563"};
          color:white;cursor:pointer;font-size:12px;
        ">Player 2</button>
      </div>
      <div style="font-size:10px;text-align:center;margin-top:8px;color:#9ca3af;">
        Click to switch - causes re-render
      </div>
    `;
  };

  // Global functions for switching
  (window as any).switchToPlayer1 = () => {
    socket.switchToPlayer("player1");
    update();
  };

  (window as any).switchToPlayer2 = () => {
    socket.switchToPlayer("player2");
    update();
  };

  update();
  document.body.appendChild(div);
}, 1000);

export default socket;
