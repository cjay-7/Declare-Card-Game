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
    const code = addCode.trim().replace(/^#/, ""); // strip leading # if user types it
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-white font-bold text-lg">Friends</h2>
            {user?.friendCode && (
              <div className="text-xs text-gray-400">Your code: <span className="text-amber-400 font-mono font-semibold">#{user.friendCode}</span></div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-xl leading-none">
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {(["friends", "requests", "add"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                tab === t
                  ? "text-amber-400 border-b-2 border-amber-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t === "friends" ? "Friends" : t === "requests" ? `Requests${requests.length ? ` (${requests.length})` : ""}` : "Add"}
            </button>
          ))}
        </div>

        <div className="p-4 max-h-80 overflow-y-auto">
          {/* Friends list */}
          {tab === "friends" && (
            <div className="space-y-2">
              {friends.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">No friends yet. Add some!</p>
              )}
              {friends.map((f) => (
                <div key={f.friend_id} className="flex items-center gap-3 py-2">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-[#2a2a2a] border border-white/10 flex items-center justify-center text-sm text-gray-400">
                      {f.display_name[0].toUpperCase()}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#1a1a1a] ${
                        f.isOnline ? "bg-green-400" : "bg-gray-600"
                      }`}
                    />
                  </div>
                  <span className="text-white text-sm flex-1">{f.display_name}</span>
                  {roomId && f.isOnline && (
                    <button
                      onClick={() => handleInvite(f)}
                      className="text-xs px-2.5 py-1 rounded-lg font-semibold text-[#1a1a1a] transition-all"
                      style={{ background: "linear-gradient(135deg, #f59e0b, #b45309)" }}
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
                <p className="text-gray-500 text-sm text-center py-4">No pending requests.</p>
              )}
              {requests.map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-[#2a2a2a] border border-white/10 flex items-center justify-center text-sm text-gray-400">
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
              <p className="text-gray-400 text-xs">Enter their friend code (shown on their profile):</p>
              <input
                type="text"
                value={addCode}
                onChange={(e) => { setAddCode(e.target.value.toUpperCase()); setAddStatus(""); setAddError(""); }}
                placeholder="#A1B2C3"
                maxLength={7}
                className="w-full px-3 py-2.5 bg-[#2a2a2a] text-white rounded-xl border border-white/10 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 placeholder-gray-600 text-sm font-mono tracking-wider transition-all"
              />
              {addStatus === "error" && (
                <p className="text-red-400 text-xs">{addError}</p>
              )}
              {addStatus === "success" && (
                <p className="text-green-400 text-xs">Friend request sent!</p>
              )}
              <button
                type="submit"
                disabled={addStatus === "loading" || !addCode.trim()}
                className="w-full py-2.5 rounded-xl font-bold text-[#1a1a1a] text-sm transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #f59e0b, #b45309)" }}
              >
                {addStatus === "loading" ? "Sending…" : "Send Request"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
