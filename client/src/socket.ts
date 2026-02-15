// client/src/socket.ts - Socket implementation with real multiplayer support
import { io, Socket } from "socket.io-client";
import DualPlayerMockSocket from "./utils/DualPlayerMockSocket";

// Determine mode: 'mock' for same device, 'real' for real multiplayer
// Check localStorage or use 'real' as default
const getSocketMode = (): "mock" | "real" => {
  const savedMode = localStorage.getItem("socketMode");
  return (savedMode as "mock" | "real") || "real";
};

let socketMode = getSocketMode();

// For mock mode
let currentPlayerId = "player1";
let switcherAdded = false;

// For real mode - connect to server
// Auto-detect server URL based on current hostname (works for network access)
const getServerUrl = () => {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  // Local development fallback
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:4000";
  }
  // On a deployed/remote host with no VITE_SERVER_URL set — warn loudly
  console.error(
    "⚠️ VITE_SERVER_URL is not set! Socket cannot connect to the game server. " +
    "Set VITE_SERVER_URL to your server's URL (e.g. https://declare-server-xxxx.onrender.com) " +
    "in your deployment environment variables."
  );
  // Return a placeholder that will fail gracefully rather than connecting to the wrong host
  return `${window.location.protocol}//${hostname}`;
};
const SERVER_URL = getServerUrl();
let realSocket: Socket | null = null;

// Initialize real socket connection
const initRealSocket = () => {
  if (!realSocket) {
    const token = localStorage.getItem("token");
    console.log(`🔌 Connecting to server at: ${SERVER_URL}`);
    realSocket = io(SERVER_URL, {
      // Try polling first (more reliable for network connections), then websocket
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10, // More attempts
      reconnectionDelayMax: 5000,
      timeout: 20000, // 20 second timeout (default is 20s but make it explicit)
      forceNew: false,
      // Send JWT token so server can attach userId
      auth: token ? { token } : {},
      // Enable debug logging in development
      ...(import.meta.env.DEV && { debug: true }),
    });

    realSocket.on("connect", () => {
      console.log("✅ Connected to server:", realSocket?.id, "at", SERVER_URL);
      console.log("   Transport:", realSocket.io.engine.transport.name);
    });

    realSocket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error.message);
      console.error("   Attempted to connect to:", SERVER_URL);
      console.error("   Error type:", error.type);
      console.error("   Make sure:");
      console.error("   1. Server is running on port 4000");
      console.error("   2. Server is listening on 0.0.0.0 (all interfaces)");
      console.error("   3. Firewall allows connections on port 4000");
      console.error("   4. You're using the correct IP address");
    });

    realSocket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from server:", reason);
      if (reason === "io server disconnect") {
        // Server disconnected the socket, reconnect manually
        realSocket?.connect();
      }
    });

    realSocket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
    });

    realSocket.on("reconnect", (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
    });

    realSocket.on("reconnect_error", (error) => {
      console.error("❌ Reconnection error:", error.message);
    });

    realSocket.on("reconnect_failed", () => {
      console.error("❌ Reconnection failed after all attempts");
    });

    realSocket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  }
  return realSocket;
};

// Socket wrapper that supports both modes
const socket = {
  getId: () => {
    if (socketMode === "mock") {
      return currentPlayerId;
    }
    return realSocket?.id || "";
  },

  emit: (event: string, data?: any) => {
    if (socketMode === "mock") {
      return DualPlayerMockSocket.getInstance(currentPlayerId).emit(event, data);
    }
    if (!realSocket) {
      initRealSocket();
    }
    // Socket.io automatically queues events if not connected, but log for debugging
    if (realSocket && !realSocket.connected) {
      console.warn(`⚠️ Socket not connected yet for emit("${event}"), Socket.io will queue it`);
    }
    return realSocket?.emit(event, data);
  },

  on: (event: string, listener: (...args: any[]) => void) => {
    if (socketMode === "mock") {
      return DualPlayerMockSocket.getInstance(currentPlayerId).on(
        event,
        listener
      );
    }
    if (!realSocket) initRealSocket();
    realSocket?.on(event, listener);
    return socket;
  },

  off: (event: string, listener: (...args: any[]) => void) => {
    if (socketMode === "mock") {
      DualPlayerMockSocket.getInstance("player1").off(event, listener);
      DualPlayerMockSocket.getInstance("player2").off(event, listener);
    } else {
      realSocket?.off(event, listener);
    }
    return socket;
  },

  // Helper to switch players (only for mock mode)
  switchToPlayer: (playerId: "player1" | "player2") => {
    if (socketMode !== "mock") {
      console.warn("switchToPlayer only works in mock mode");
      return;
    }

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

  // Get current socket mode
  getMode: () => socketMode,

  // Switch between modes
  setMode: (mode: "mock" | "real") => {
    socketMode = mode;
    localStorage.setItem("socketMode", mode);

    // Clean up old connections
    if (mode === "real" && realSocket === null) {
      initRealSocket();
    }

    // Update UI - COMMENTED OUT
    // updateModeSwitcherUI();

    console.log(`🔄 Socket mode changed to: ${mode}`);

    // Reload page to reinitialize
    window.location.reload();
  },
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

// Add switcher UI only once (for mock mode)
const addSwitcherUI = () => {
  if (socketMode !== "mock") return;
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

// Mode switcher UI - COMMENTED OUT (not required)
/*
const updateModeSwitcherUI = () => {
  const div = document.getElementById("mode-switcher");
  if (!div) {
    addModeSwitcherUI();
    return;
  }

  div.innerHTML = `
    <div style="font-weight:bold;margin-bottom:8px;text-align:center;color:#fff;">🌐 Multiplayer Mode</div>
    <div style="margin-bottom:8px;text-align:center;font-size:12px;color:#ccc;">
      Current: <span style="color:${
        socketMode === "real" ? "#10b981" : "#f59e0b"
      };font-weight:bold;">
        ${socketMode === "real" ? "Online" : "Same Device"}
      </span>
    </div>
    <div style="display:flex;gap:8px;flex-direction:column;">
      <button id="mode-real" style="
        padding:8px 12px;border:none;border-radius:6px;
        background:${socketMode === "real" ? "#10b981" : "#4b5563"};
        color:white;cursor:pointer;font-size:12px;font-weight:bold;
        transition: all 0.2s ease;
      ">🌍 Online (2 Devices)</button>
      <button id="mode-mock" style="
        padding:8px 12px;border:none;border-radius:6px;
        background:${socketMode === "mock" ? "#f59e0b" : "#4b5563"};
        color:white;cursor:pointer;font-size:12px;font-weight:bold;
        transition: all 0.2s ease;
      ">🖥️ Same Device</button>
    </div>
    <div style="font-size:10px;text-align:center;margin-top:8px;color:#9ca3af;">
      Switch will reload the page
    </div>
  `;

  // Add event listeners
  const realButton = document.getElementById("mode-real");
  const mockButton = document.getElementById("mode-mock");

  if (realButton) {
    realButton.onclick = () => {
      if (socketMode !== "real") {
        console.log("Switching to real multiplayer mode");
        socket.setMode("real");
      }
    };
  }
  if (mockButton) {
    mockButton.onclick = () => {
      if (socketMode !== "mock") {
        console.log("Switching to mock mode");
        socket.setMode("mock");
      }
    };
  }
};

const addModeSwitcherUI = () => {
  if (document.getElementById("mode-switcher")) return;

  const div = document.createElement("div");
  div.id = "mode-switcher";
  div.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 9999;
    background: rgba(0,0,0,0.9);
    color: white;
    padding: 12px;
    border-radius: 10px;
    font-family: Arial, sans-serif;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.1);
    min-width: 180px;
  `;

  document.body.appendChild(div);
  updateModeSwitcherUI();

  console.log("🌐 Mode switcher UI added");
};
*/

// Initialize UI when DOM is ready - MODE SWITCHER COMMENTED OUT
const initializeUI = () => {
  // Remove mode switcher if it exists
  const modeSwitcher = document.getElementById("mode-switcher");
  if (modeSwitcher) {
    modeSwitcher.remove();
  }
  
  // addModeSwitcherUI(); // COMMENTED OUT - not required
  if (socketMode === "mock") {
    addSwitcherUI();
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeUI);
} else {
  setTimeout(initializeUI, 1000);
}

// Manual initialization - try to add UI every 2 seconds until it exists
const ensureUI = () => {
  // Remove mode switcher if it exists
  const modeSwitcher = document.getElementById("mode-switcher");
  if (modeSwitcher) {
    modeSwitcher.remove();
  }
  
  // addModeSwitcherUI(); // COMMENTED OUT - not required
  if (socketMode === "mock" && !document.getElementById("player-switcher")) {
    addSwitcherUI();
  }
};

setTimeout(ensureUI, 2000);
setTimeout(ensureUI, 5000);

// Initialize real socket if in real mode
if (socketMode === "real") {
  initRealSocket();
}

export default socket;
