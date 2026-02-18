import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameContext } from "../contexts/GameContext";
import { useAuth } from "../contexts/AuthContext";
import GameInstructionsModal from "./GameInstructionsModal";
import FriendsPanel from "./FriendsPanel";
import InviteNotification from "./InviteNotification";
import socket from "../socket";

interface LobbyProps {
  onJoinRoom: (roomId: string, playerName: string) => void;
  onLogout: () => void;
}

const Lobby = ({ onJoinRoom, onLogout }: LobbyProps) => {
  const [roomId, setRoomId] = useState("");
  const [roomError, setRoomError] = useState("");
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [invitedNames, setInvitedNames] = useState<string[]>([]);
  const { setPlayerName } = useGameContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isMockMode = socket.getMode() === "mock";
  const currentPlayerId = socket.getCurrentPlayer();
  const mockPlayerName = currentPlayerId === "player1" ? "Player 1" : "Player 2";
  const playerName = isMockMode ? mockPlayerName : (user?.displayName ?? "");

  const handleJoin = () => {
    if (!roomId) {
      setRoomError("Please enter a room ID");
      return;
    }
    setRoomError("");
    setPlayerName(playerName);
    onJoinRoom(roomId, playerName);
    navigate("/game");
  };

  const handleInviteJoin = (inviteRoomId: string) => {
    setRoomId(inviteRoomId);
    setPlayerName(playerName);
    onJoinRoom(inviteRoomId, playerName);
    navigate("/game");
  };

  const generateRandomRoomId = () => {
    setRoomId(Math.random().toString(36).substring(2, 8).toUpperCase());
    setRoomError("");
  };

  const handleCopyRoomId = async () => {
    if (!roomId) return;
    await navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInviteSent = (_friendId: string, friendName: string) => {
    setInvitedNames((prev) => [...prev, friendName]);
    setTimeout(
      () => setInvitedNames((prev) => prev.filter((n) => n !== friendName)),
      3000
    );
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#262626] p-4">
      <div
        className="border border-white/10 rounded-2xl p-8 w-full max-w-md"
        style={{ backgroundColor: "var(--surface-container)", boxShadow: "var(--elevation-2)" }}
      >
        <div className="text-center mb-8">
          <img src="/logo-square.png" alt="" width={48} height={48} className="mx-auto mb-1" style={{ width: 48, height: 48 }} />
          <h1 className="text-3xl font-bold text-white tracking-wide">Declare</h1>
          <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>A multiplayer card game</p>
        </div>

        {/* Player Info */}
        <div
          className="border border-white/10 rounded-xl p-3.5 mb-6 flex items-center justify-between"
          style={{ backgroundColor: "var(--surface-container-high)" }}
        >
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--on-surface-variant)" }}>Playing as</div>
            <div className="text-base font-semibold text-white mt-0.5">{playerName}</div>
            {user?.friendCode && (
              <div className="text-xs text-amber-400 font-mono mt-0.5">#{user.friendCode}</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isMockMode && (
              <>
                <button
                  onClick={() => setIsFriendsOpen(true)}
                  className="relative text-gray-400 hover:text-amber-400 transition-colors p-1.5 rounded-lg hover:bg-white/5"
                  aria-label="Open friends panel"
                  title="Friends"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <button
                  onClick={onLogout}
                  className="text-xs hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                  style={{ color: "var(--on-surface-variant)" }}
                >
                  Sign out
                </button>
              </>
            )}
            {isMockMode && (
              <div className="text-xs" style={{ color: "var(--on-surface-variant)" }}>Use switcher (top right)</div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Room ID input */}
          <div>
            <label htmlFor="lobby-room-id" className="block mb-1.5 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--on-surface-variant)" }}>
              Room ID
            </label>
            <div className="flex gap-2">
              <input
                id="lobby-room-id"
                type="text"
                placeholder="Enter room ID"
                value={roomId}
                onChange={(e) => { setRoomId(e.target.value.toUpperCase()); setRoomError(""); }}
                aria-invalid={!!roomError}
                aria-describedby={roomError ? "room-error" : undefined}
                className="flex-1 px-4 py-3 text-white rounded-xl border border-white/10 focus:outline-none focus-visible:outline-2 focus-visible:outline-amber-500 focus-visible:outline-offset-2 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 placeholder-gray-600 transition-all"
                style={{ backgroundColor: "var(--surface-container-highest)" }}
              />
              <button
                onClick={generateRandomRoomId}
                className="px-3 py-3 text-gray-400 hover:text-white rounded-xl border border-white/10 hover:border-white/20 transition-all"
                style={{ backgroundColor: "var(--surface-container-high)" }}
                aria-label="Generate random room ID"
                title="Random room ID"
              >
                🎲
              </button>
              {roomId && (
                <button
                  onClick={handleCopyRoomId}
                  className="px-3 py-3 text-gray-400 hover:text-amber-400 rounded-xl border border-white/10 hover:border-amber-500/30 transition-all"
                  style={{ backgroundColor: "var(--surface-container-high)" }}
                  aria-label="Copy room code"
                  title="Copy room code"
                >
                  {copied ? "\u2713" : "\uD83D\uDCCB"}
                </button>
              )}
            </div>
            {roomError && (
              <p id="room-error" role="alert" className="text-xs mt-1.5" style={{ color: "var(--error)" }}>
                {roomError}
              </p>
            )}
            {copied && (
              <p className="text-green-400 text-xs mt-1">Room code copied!</p>
            )}

            {/* Invite friends button */}
            {roomId && !isMockMode && (
              <button
                onClick={() => setIsFriendsOpen(true)}
                className="mt-2 w-full py-2 text-xs font-semibold text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-500/10 transition-all"
              >
                Invite Friends &rarr;
              </button>
            )}

            {/* Invited confirmation */}
            {invitedNames.length > 0 && (
              <p className="text-green-400 text-xs mt-1">
                Invited: {invitedNames.join(", ")}
              </p>
            )}
          </div>

          <div className="flex flex-col space-y-3">
            <button
              onClick={handleJoin}
              disabled={!roomId}
              className="w-full py-3.5 rounded-xl font-bold text-base tracking-wide transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98]"
              style={{
                color: "var(--on-primary)",
                background: !roomId
                  ? "var(--surface-container-high)"
                  : "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)",
                boxShadow: !roomId ? "none" : "0 4px 20px rgba(245, 158, 11, 0.35)",
              }}
            >
              {`Join Room${roomId ? ` \u00B7 ${roomId}` : ""}`}
            </button>
          </div>

          <div className="pt-2 border-t border-white/5">
            <button
              onClick={() => setIsInstructionsOpen(true)}
              className="w-full py-2.5 text-sm hover:text-gray-300 transition-colors"
              style={{ color: "var(--on-surface-variant)" }}
            >
              How to Play
            </button>
          </div>
        </div>
      </div>

      <GameInstructionsModal
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
      />

      <FriendsPanel
        isOpen={isFriendsOpen}
        onClose={() => setIsFriendsOpen(false)}
        roomId={roomId || undefined}
        onInviteSent={handleInviteSent}
      />

      <InviteNotification onJoin={handleInviteJoin} />
    </main>
  );
};

export default Lobby;
