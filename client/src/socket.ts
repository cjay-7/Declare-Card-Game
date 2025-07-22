// client/src/socket.ts - Clean implementation for 2-player same device
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

  off: (event: string, listener: (...args: any[]) => void) => {
    DualPlayerMockSocket.getInstance("player1").off(event, listener);
    DualPlayerMockSocket.getInstance("player2").off(event, listener);
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
    <div style="font-size:10px;text-align:center;margin-top:8px;color:#9ca3af;">
      Click to switch player perspective
    </div>
  `;

  // Add event listeners
  const p1Button = document.getElementById("switch-p1");
  const p2Button = document.getElementById("switch-p2");

  if (p1Button) {
    p1Button.onclick = () => {
      console.log("Switching to Player 1");
      socket.switchToPlayer("player1");
    };
  }
  if (p2Button) {
    p2Button.onclick = () => {
      console.log("Switching to Player 2");
      socket.switchToPlayer("player2");
    };
  }

  console.log("🎮 Player switcher UI updated");
};

// Add switcher UI only once
const addSwitcherUI = () => {
  if (switcherAdded || document.getElementById("player-switcher")) return;

  const div = document.createElement("div");
  div.id = "player-switcher";
  div.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 9999;
    background: rgba(0,0,0,0.9);
    color: white;
    padding: 12px;
    border-radius: 10px;
    font-family: Arial, sans-serif;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.1);
    min-width: 160px;
  `;

  document.body.appendChild(div);
  updateSwitcherUI(); // Call updateSwitcherUI after appending to DOM
  switcherAdded = true;

  console.log("🎮 Player switcher UI added");
};

// Initialize switcher when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", addSwitcherUI);
} else {
  // DOM is already loaded
  setTimeout(addSwitcherUI, 1000); // Increase timeout to ensure page is fully loaded
}

// Manual initialization - try to add switcher every 2 seconds until it exists
const ensureSwitcher = () => {
  if (!document.getElementById("player-switcher")) {
    console.log("Attempting to create player switcher...");
    addSwitcherUI();
  }
};

// Try multiple times to ensure switcher is created
setTimeout(ensureSwitcher, 2000);
setTimeout(ensureSwitcher, 5000);
setTimeout(ensureSwitcher, 10000);

export default socket;
