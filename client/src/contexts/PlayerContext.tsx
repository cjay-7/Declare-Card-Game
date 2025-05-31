// client/src/contexts/PlayerContext.tsx - Simple player switching context
import React, { createContext, useContext, useState, useEffect } from "react";
import DualPlayerMockSocket from "../utils/DualPlayerMockSocket";

interface PlayerContextType {
  currentPlayerId: string;
  switchToPlayer: (playerId: string) => void;
  socket: any;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const usePlayerContext = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayerContext must be used within PlayerProvider");
  }
  return context;
};

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentPlayerId, setCurrentPlayerId] = useState("player1");
  const [switcherAdded, setSwitcherAdded] = useState(false);

  // Create socket object that uses current player
  const socket = {
    getId: () => currentPlayerId,
    emit: (event: string, data?: any) => {
      return DualPlayerMockSocket.getInstance(currentPlayerId).emit(
        event,
        data
      );
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
  };

  const switchToPlayer = (playerId: string) => {
    setCurrentPlayerId(playerId);
    console.log(`🔄 Switched to ${playerId}`);
  };

  // Add UI switcher
  useEffect(() => {
    if (switcherAdded) return;

    const div = document.createElement("div");
    div.id = "player-switcher";
    div.style.cssText =
      "position:fixed;top:10px;right:10px;z-index:9999;background:rgba(0,0,0,0.9);color:white;padding:12px;border-radius:8px;font-family: Arial, sans-serif;";

    const update = () => {
      div.innerHTML = `
        <div style="font-weight:bold;margin-bottom:8px;text-align:center;">🎮 Player View</div>
        <div style="margin-bottom:8px;text-align:center;font-size:12px;">Current: <span style="color:${
          currentPlayerId === "player1" ? "#3b82f6" : "#10b981"
        };">${
        currentPlayerId === "player1" ? "Player 1" : "Player 2"
      }</span></div>
        <div style="display:flex;gap:8px;">
          <button id="p1" style="padding:6px 12px;border:none;border-radius:4px;background:${
            currentPlayerId === "player1" ? "#3b82f6" : "#4b5563"
          };color:white;cursor:pointer;font-size:12px;">Player 1</button>
          <button id="p2" style="padding:6px 12px;border:none;border-radius:4px;background:${
            currentPlayerId === "player2" ? "#10b981" : "#4b5563"
          };color:white;cursor:pointer;font-size:12px;">Player 2</button>
        </div>
        <div style="font-size:10px;text-align:center;margin-top:8px;color:#9ca3af;">Switch player perspective</div>
      `;
    };

    update();
    document.body.appendChild(div);
    setSwitcherAdded(true);

    div.onclick = (e) => {
      const target = e.target as HTMLElement;
      if (target.id === "p1") {
        switchToPlayer("player1");
        update();
      } else if (target.id === "p2") {
        switchToPlayer("player2");
        update();
      }
    };

    return () => {
      const existingDiv = document.getElementById("player-switcher");
      if (existingDiv) {
        existingDiv.remove();
      }
    };
  }, [currentPlayerId, switcherAdded]);

  return (
    <PlayerContext.Provider value={{ currentPlayerId, switchToPlayer, socket }}>
      {children}
    </PlayerContext.Provider>
  );
};
