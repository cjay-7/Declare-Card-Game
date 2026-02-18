import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";

interface Friend {
  id: string;
  friend_id: string;
  display_name: string;
  avatar_url?: string | null;
  isOnline: boolean;
}

interface FriendRequest {
  id: string;
  from_id: string;
  display_name: string;
  created_at: string;
}

interface FriendsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
  onInviteSent?: (friendId: string, friendName: string) => void;
}

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function FriendsPanel({ isOpen, onClose, roomId, onInviteSent }: FriendsPanelProps) {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<"friends" | "requests" | "add">("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [addCode, setAddCode] = useState("");
  const [addStatus, setAddStatus] = useState<"" | "loading" | "success" | "error">("");
  const [addError, setAddError] = useState("");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchFriends = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API}/api/friends`, { headers });
    if (res.ok) setFriends(await res.json());
  }, [token]);

  const fetchRequests = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API}/api/friends/requests`, { headers });
    if (res.ok) setRequests(await res.json());
  }, [token]);

  useEffect(() => {
    if (!isOpen) return;
    fetchFriends();
    fetchRequests();
  }, [isOpen, fetchFriends, fetchRequests]);

  async function handleAddFriend(e: React.FormEvent) {
    e.preventDefault();
    const code = addCode.trim().replace(/^#/, "");
    if (!code) return;
    setAddStatus("loading");
    setAddError("");
    const res = await fetch(`${API}/api/friends/add`, {
      method: "POST",
      headers,
      body: JSON.stringify({ friendCode: code }),
    });
    const data = await res.json();
    if (res.ok) {
      setAddStatus("success");
      setAddCode("");
      setTimeout(() => setAddStatus(""), 2000);
    } else {
      setAddStatus("error");
      setAddError(data.error || "Failed to send request");
    }
  }

  async function handleRespond(id: string, status: "accepted" | "declined") {
    await fetch(`${API}/api/friends/respond`, {
      method: "POST",
      headers,
      body: JSON.stringify({ id, status }),
    });
    fetchRequests();
    if (status === "accepted") fetchFriends();
  }

  function handleInvite(friend: Friend) {
    if (!roomId) return;
    import("../socket").then(({ default: socket }) => {
      socket.emit("send-game-invite", { roomId, toUserId: friend.friend_id });
    });
    onInviteSent?.(friend.friend_id, friend.display_name);
  }

  if (!isOpen) return null;

  const tabs = ["friends", "requests", "add"] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Friends panel"
    >
      <div
        className="border border-white/10 rounded-2xl w-full max-w-sm"
        style={{ backgroundColor: "var(--surface-container)", boxShadow: "var(--elevation-3)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-white font-bold text-lg">Friends</h2>
            {user?.friendCode && (
              <div className="text-xs" style={{ color: "var(--on-surface-variant)" }}>Your code: <span className="text-amber-400 font-mono font-semibold">#{user.friendCode}</span></div>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-white transition-colors text-xl leading-none">
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10" role="tablist">
          {tabs.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                tab === t
                  ? "text-amber-400 border-b-2 border-amber-400"
                  : "hover:text-gray-300"
              }`}
              style={{ color: tab === t ? undefined : "var(--on-surface-variant)" }}
            >
              {t === "friends" ? "Friends" : t === "requests" ? `Requests${requests.length ? ` (${requests.length})` : ""}` : "Add"}
            </button>
          ))}
        </div>

        <div className="p-4 max-h-80 overflow-y-auto" role="tabpanel">
          {/* Friends list */}
          {tab === "friends" && (
            <div className="space-y-2">
              {friends.length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: "var(--on-surface-variant)" }}>No friends yet. Add some!</p>
              )}
              {friends.map((f) => (
                <div key={f.friend_id} className="flex items-center gap-3 py-2">
                  <div className="relative">
                    <div
                      className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-sm text-gray-400"
                      style={{ backgroundColor: "var(--surface-container-high)" }}
                    >
                      {f.display_name[0].toUpperCase()}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                        f.isOnline ? "bg-green-400" : "bg-gray-600"
                      }`}
                      style={{ borderColor: "var(--surface-container)" }}
                    />
                  </div>
                  <span className="text-white text-sm flex-1">{f.display_name}</span>
                  {roomId && (
                    <button
                      onClick={() => handleInvite(f)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${
                        f.isOnline
                          ? "text-[#1a1a1a]"
                          : "text-gray-300 opacity-70"
                      }`}
                      style={{ background: f.isOnline
                        ? "linear-gradient(135deg, #f59e0b, #b45309)"
                        : "linear-gradient(135deg, #4b5563, #374151)"
                      }}
                    >
                      Invite
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Friend requests */}
          {tab === "requests" && (
            <div className="space-y-2">
              {requests.length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: "var(--on-surface-variant)" }}>No pending requests.</p>
              )}
              {requests.map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-2">
                  <div
                    className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-sm text-gray-400"
                    style={{ backgroundColor: "var(--surface-container-high)" }}
                  >
                    {r.display_name[0].toUpperCase()}
                  </div>
                  <span className="text-white text-sm flex-1">{r.display_name}</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleRespond(r.id, "accepted")}
                      className="text-xs px-2.5 py-1 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors font-semibold"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespond(r.id, "declined")}
                      className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add friend */}
          {tab === "add" && (
            <form onSubmit={handleAddFriend} className="space-y-3">
              <label htmlFor="friend-code-input" className="block text-xs" style={{ color: "var(--on-surface-variant)" }}>
                Enter their friend code (shown on their profile):
              </label>
              <input
                id="friend-code-input"
                type="text"
                value={addCode}
                onChange={(e) => { setAddCode(e.target.value.toUpperCase()); setAddStatus(""); setAddError(""); }}
                placeholder="#A1B2C3"
                maxLength={7}
                className="w-full px-3 py-2.5 text-white rounded-xl border border-white/10 focus:outline-none focus-visible:outline-2 focus-visible:outline-amber-500 focus-visible:outline-offset-2 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 placeholder-gray-600 text-sm font-mono tracking-wider transition-all"
                style={{ backgroundColor: "var(--surface-container-highest)" }}
              />
              {addStatus === "error" && (
                <p role="alert" className="text-xs" style={{ color: "var(--error)" }}>{addError}</p>
              )}
              {addStatus === "success" && (
                <p className="text-green-400 text-xs">Friend request sent!</p>
              )}
              <button
                type="submit"
                disabled={addStatus === "loading" || !addCode.trim()}
                className="w-full py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40 hover:brightness-110 active:scale-[0.98]"
                style={{ color: "var(--on-primary)", background: "linear-gradient(135deg, #f59e0b, #b45309)" }}
              >
                {addStatus === "loading" ? "Sending\u2026" : "Send Request"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
