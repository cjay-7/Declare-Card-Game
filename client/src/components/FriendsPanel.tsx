import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Drawer, Tabs, Input, Button, IconButton, Typography, Spinner, Avatar, Badge, Chip, Alert, List } from "@material-tailwind/react";

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

  return (
    <Drawer open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Drawer.Overlay lockScroll className="bg-black/60 backdrop-blur-sm">
        <Drawer.Panel
          placement="right"
          className="border-l border-white/10 w-full max-w-sm h-full"
          style={{ backgroundColor: "var(--surface-container)", boxShadow: "var(--elevation-3)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div>
              <Typography as="h2" className="text-white font-bold text-lg">Friends</Typography>
              {user?.friendCode && (
                <Chip isPill size="sm" variant="ghost" color="primary" className="mt-0.5 inline-flex">
                  <Chip.Label className="text-xs font-mono">#{user.friendCode}</Chip.Label>
                </Chip>
              )}
            </div>
            <Drawer.DismissTrigger
              as={IconButton}
              variant="ghost"
              size="sm"
              aria-label="Close"
              className="text-gray-400 hover:text-white"
            >
              &times;
            </Drawer.DismissTrigger>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="friends">
            <Tabs.List className="flex border-b border-white/10 bg-transparent">
              <Tabs.Trigger value="friends" className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider">
                Friends
              </Tabs.Trigger>
              <Tabs.Trigger value="requests" className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider">
                <span className="relative">
                  Requests
                  {requests.length > 0 && (
                    <Badge color="error" placement="top-end" className="absolute -top-2 -right-5">
                      <Badge.Indicator className="text-[10px] min-w-[18px] h-[18px] flex items-center justify-center">
                        {requests.length}
                      </Badge.Indicator>
                    </Badge>
                  )}
                </span>
              </Tabs.Trigger>
              <Tabs.Trigger value="add" className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider">
                Add
              </Tabs.Trigger>
              <Tabs.TriggerIndicator />
            </Tabs.List>

            {/* Friends list */}
            <Tabs.Panel value="friends" className="p-4 max-h-[calc(100vh-180px)] overflow-y-auto">
              {friends.length === 0 ? (
                <Typography className="text-sm text-center py-4" style={{ color: "var(--on-surface-variant)" }}>
                  No friends yet. Add some!
                </Typography>
              ) : (
                <List className="p-0">
                  {friends.map((f) => (
                    <List.Item key={f.friend_id} ripple={false} className="py-2 px-1">
                      <List.ItemStart className="mr-3">
                        <Badge overlap="circular" color={f.isOnline ? "success" : "secondary"} placement="bottom-end">
                          <Badge.Content>
                            {f.avatar_url ? (
                              <Avatar
                                src={f.avatar_url}
                                alt={f.display_name}
                                size="sm"
                              />
                            ) : (
                              <Avatar
                                as="div"
                                alt={f.display_name}
                                size="sm"
                                className="bg-gray-700 text-gray-400 text-sm flex items-center justify-center rounded-full"
                              >
                                {f.display_name[0].toUpperCase()}
                              </Avatar>
                            )}
                          </Badge.Content>
                          <Badge.Indicator className="w-2.5 h-2.5" />
                        </Badge>
                      </List.ItemStart>
                      <div className="flex-1 min-w-0">
                        <Typography className="text-white text-sm">{f.display_name}</Typography>
                        <Chip isPill size="sm" variant="ghost" color={f.isOnline ? "success" : "secondary"} className="mt-0.5 inline-flex">
                          <Chip.Label className="text-[10px]">{f.isOnline ? "Online" : "Offline"}</Chip.Label>
                        </Chip>
                      </div>
                      {roomId && (
                        <List.ItemEnd>
                          <Button
                            size="sm"
                            variant={f.isOnline ? "gradient" : "outline"}
                            color="primary"
                            onClick={() => handleInvite(f)}
                            className="text-xs font-semibold"
                          >
                            Invite
                          </Button>
                        </List.ItemEnd>
                      )}
                    </List.Item>
                  ))}
                </List>
              )}
            </Tabs.Panel>

            {/* Friend requests */}
            <Tabs.Panel value="requests" className="p-4 max-h-[calc(100vh-180px)] overflow-y-auto">
              {requests.length === 0 ? (
                <Typography className="text-sm text-center py-4" style={{ color: "var(--on-surface-variant)" }}>
                  No pending requests.
                </Typography>
              ) : (
                <List className="p-0">
                  {requests.map((r) => (
                    <List.Item key={r.id} ripple={false} className="py-2 px-1">
                      <List.ItemStart className="mr-3">
                        <Avatar
                          as="div"
                          alt={r.display_name}
                          size="sm"
                          className="bg-gray-700 text-gray-400 text-sm flex items-center justify-center rounded-full"
                        >
                          {r.display_name[0].toUpperCase()}
                        </Avatar>
                      </List.ItemStart>
                      <Typography className="text-white text-sm flex-1">{r.display_name}</Typography>
                      <List.ItemEnd className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          color="success"
                          onClick={() => handleRespond(r.id, "accepted")}
                          className="text-xs font-semibold"
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          color="error"
                          onClick={() => handleRespond(r.id, "declined")}
                          className="text-xs"
                        >
                          Decline
                        </Button>
                      </List.ItemEnd>
                    </List.Item>
                  ))}
                </List>
              )}
            </Tabs.Panel>

            {/* Add friend */}
            <Tabs.Panel value="add" className="p-4 max-h-[calc(100vh-180px)] overflow-y-auto">
              <form onSubmit={handleAddFriend} className="space-y-3">
                <Typography as="label" htmlFor="friend-code-input" className="block text-xs" style={{ color: "var(--on-surface-variant)" }}>
                  Enter their friend code (shown on their profile):
                </Typography>
                <Input
                  id="friend-code-input"
                  type="text"
                  value={addCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setAddCode(e.target.value.toUpperCase()); setAddStatus(""); setAddError(""); }}
                  placeholder="#A1B2C3"
                  isError={addStatus === "error"}
                  color="primary"
                  className="dark font-mono tracking-wider"
                />
                {addStatus === "error" && (
                  <Alert color="error" variant="ghost" className="py-1.5 px-2">
                    <Alert.Content>
                      <Typography role="alert" className="text-xs">{addError}</Typography>
                    </Alert.Content>
                  </Alert>
                )}
                {addStatus === "success" && (
                  <Alert color="success" variant="ghost" className="py-1.5 px-2">
                    <Alert.Content>
                      <Typography className="text-xs">Friend request sent!</Typography>
                    </Alert.Content>
                  </Alert>
                )}
                <Button
                  type="submit"
                  disabled={addStatus === "loading" || !addCode.trim()}
                  variant="gradient"
                  color="primary"
                  isFullWidth
                  className="font-bold text-sm"
                >
                  {addStatus === "loading" ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner className="w-4 h-4" /> Sending&hellip;
                    </span>
                  ) : (
                    "Send Request"
                  )}
                </Button>
              </form>
            </Tabs.Panel>
          </Tabs>
        </Drawer.Panel>
      </Drawer.Overlay>
    </Drawer>
  );
}
