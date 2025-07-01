// client/src/socket.ts - Fixed implementation with proper off method
import DualPlayerMockSocket from "./utils/DualPlayerMockSocket";

// Global player state
let currentPlayerId = "player1";
let switcherAdded = false;

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

  // FIX: Properly handle off method for both instances
  off: (event: string, listener: (...args: any[]) => void) => {
    // Remove from both player instances to ensure cleanup
    try {
      const player1Instance = DualPlayerMockSocket.getInstance("player1");
      const player2Instance = DualPlayerMockSocket.getInstance("player2");

      if (player1Instance && typeof player1Instance.off === "function") {
        player1Instance.off(event, listener);
      }

      if (player2Instance && typeof player2Instance.off === "function") {
        player2Instance.off(event, listener);
      }
    } catch (error) {
      console.warn(`Error removing listener for ${event}:`, error);
    }

    return socket;
  },

  // Helper to switch players
  switchToPlayer: (playerId: "player1" | "player2") => {
    const oldPlayerId = currentPlayerId;
    currentPlayerId = playerId;
    console.log(`🔄 Switched from ${oldPlayerId} to ${playerId}`);

    // Update the switcher UI
    updateSwitcherUI();

    // Force re-render by dispatching event
    window.dispatchEvent(
      new CustomEvent("player-switched", {
        detail: { playerId, oldPlayerId },
      })
    );
  },

  getCurrentPlayer: () => currentPlayerId,
};

// Function to update switcher UI
const updateSwitcherUI = () => {
  const div = document.getElementById("player-switcher");
  if (!div) {
    console.warn("Player switcher div not found, creating it...");
    addSwitcherUI();
    return;
  }

  div.innerHTML = `
    <div style="font-weight:bold;margin-bottom:8px;text-align:center;color:#fff;">🎮 Player Switch</div>
    <div style="margin-bottom:8px;text-align:center;font-size:12px;color:#ccc;">
      Current: <span style="color:${
        currentPlayerId === "player1" ? "#3b82f6" : "#10b981"
      };font-weight:bold;">
        ${currentPlayerId === "player1" ? "Player 1" : "Player 2"}
      </span>
    </div>
    <div style="display:flex;gap:8px;">
      <button id="switch-p1" style="
        padding:8px 12px;border:none;border-radius:6px;
        background:${currentPlayerId === "player1" ? "#3b82f6" : "#4b5563"};
        color:white;cursor:pointer;font-size:12px;font-weight:bold;
        transition: all 0.2s ease;
      ">Player 1</button>
      <button id="switch-p2" style="
        padding:8px 12px;border:none;border-radius:6px;
        background:${currentPlayerId === "player2" ? "#10b981" : "#4b5563"};
        color:white;cursor:pointer;font-size:12px;font-weight:bold;
        transition: all 0.2s ease;
      ">Player 2</button>
    </div>
  `;

  // Re-attach event listeners
  const btn1 = document.getElementById("switch-p1");
  const btn2 = document.getElementById("switch-p2");

  if (btn1) {
    btn1.onclick = () => socket.switchToPlayer("player1");
  }
  if (btn2) {
    btn2.onclick = () => socket.switchToPlayer("player2");
  }
};

// Function to add switcher UI
const addSwitcherUI = () => {
  if (switcherAdded) return;

  const div = document.createElement("div");
  div.id = "player-switcher";
  div.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 9999;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 12px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    border: 1px solid #444;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  `;

  document.body.appendChild(div);
  switcherAdded = true;
  updateSwitcherUI();
};

// Initialize switcher when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", addSwitcherUI);
} else {
  addSwitcherUI();
}

export default socket;
