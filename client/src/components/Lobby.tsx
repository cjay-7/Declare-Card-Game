import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameContext } from "../contexts/GameContext";
import { useAuth } from "../contexts/AuthContext";
import GameInstructionsModal from "./GameInstructionsModal";
import FriendsPanel from "./FriendsPanel";
import InviteNotification from "./InviteNotification";
import socket from "../socket";
import { Button, Input, IconButton, Typography, Card, Navbar, Avatar, Chip, Alert, Tooltip, Collapse } from "@material-tailwind/react";

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
    <main className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6" style={{ backgroundColor: "var(--surface)" }}>
      <Card
        className="w-full border"
        style={{
          maxWidth: "var(--container-md)",
          backgroundColor: "var(--surface-container)",
          boxShadow: "var(--elevation-2)",
          borderColor: "rgba(255, 255, 255, 0.1)",
          borderRadius: "var(--radius-2xl)",
        }}
      >
        <Card.Header className="text-center pt-8 px-6 sm:px-8 pb-0">
          <img src="/logo-square.png" alt="" width={48} height={48} className="mx-auto mb-2" style={{ width: 48, height: 48 }} />
          <Typography as="h1" className="font-bold text-white tracking-wide" style={{ fontSize: "var(--text-3xl)" }}>
            Declare
          </Typography>
          <Typography className="mt-1" style={{ color: "var(--on-surface-variant)", fontSize: "var(--text-sm)" }}>
            A multiplayer card game
          </Typography>
        </Card.Header>

        <Card.Body className="px-6 sm:px-8 pt-6 pb-2">
          {/* Player Info Navbar */}
          <Navbar
            className="border p-3.5 mb-6"
            style={{
              backgroundColor: "var(--surface-container-high)",
              borderColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "var(--radius-xl)",
            }}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <Avatar
                  as="div"
                  alt={playerName}
                  size="sm"
                  className="bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center rounded-full"
                  style={{ fontSize: "var(--text-sm)" }}
                >
                  {playerName[0]?.toUpperCase() ?? "?"}
                </Avatar>
                <div>
                  <Typography className="uppercase tracking-wider font-semibold" style={{ color: "var(--on-surface-variant)", fontSize: "var(--text-xs)" }}>
                    Playing as
                  </Typography>
                  <Typography className="font-semibold text-white mt-0.5" style={{ fontSize: "var(--text-base)" }}>
                    {playerName}
                  </Typography>
                  {user?.friendCode && (
                    <Chip isPill size="sm" variant="ghost" color="primary" className="mt-0.5 inline-flex">
                      <Chip.Label className="font-mono" style={{ fontSize: "var(--text-xs)" }}>#{user.friendCode}</Chip.Label>
                    </Chip>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isMockMode && (
                  <>
                    <Tooltip>
                      <Tooltip.Trigger
                        as={IconButton}
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsFriendsOpen(true)}
                        aria-label="Open friends panel"
                        style={{ color: "var(--on-surface-variant)" }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </Tooltip.Trigger>
                      <Tooltip.Content
                        className="px-2 py-1"
                        style={{
                          backgroundColor: "var(--surface-container-highest)",
                          color: "var(--on-surface)",
                          fontSize: "var(--text-xs)",
                          borderRadius: "var(--radius-sm)",
                        }}
                      >
                        Friends
                      </Tooltip.Content>
                    </Tooltip>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onLogout}
                      style={{ color: "var(--on-surface-variant)", fontSize: "var(--text-xs)" }}
                    >
                      Sign out
                    </Button>
                  </>
                )}
                {isMockMode && (
                  <Typography style={{ color: "var(--on-surface-variant)", fontSize: "var(--text-xs)" }}>
                    Use switcher (top right)
                  </Typography>
                )}
              </div>
            </div>
          </Navbar>

          <div className="space-y-4">
            {/* Room ID input */}
            <div>
              <label
                htmlFor="lobby-room-id"
                className="block mb-1.5 font-medium uppercase tracking-wider"
                style={{ color: "var(--on-surface-variant)", fontSize: "var(--text-xs)" }}
              >
                Room ID
              </label>
              <div className="flex gap-2">
                <Input
                  id="lobby-room-id"
                  type="text"
                  placeholder="Enter room ID"
                  value={roomId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setRoomId(e.target.value.toUpperCase()); setRoomError(""); }}
                  aria-invalid={!!roomError}
                  aria-describedby={roomError ? "room-error" : undefined}
                  isError={!!roomError}
                  color="primary"
                  className="dark flex-1"
                />
                <Tooltip>
                  <Tooltip.Trigger as={IconButton} variant="outline" onClick={generateRandomRoomId} aria-label="Generate random room ID" className="flex-shrink-0">
                    🎲
                  </Tooltip.Trigger>
                  <Tooltip.Content
                    className="px-2 py-1"
                    style={{
                      backgroundColor: "var(--surface-container-highest)",
                      color: "var(--on-surface)",
                      fontSize: "var(--text-xs)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    Random room ID
                  </Tooltip.Content>
                </Tooltip>
                {roomId && (
                  <Tooltip>
                    <Tooltip.Trigger as={IconButton} variant="outline" onClick={handleCopyRoomId} aria-label="Copy room code" className="flex-shrink-0">
                      {copied ? "\u2713" : "\uD83D\uDCCB"}
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      className="px-2 py-1"
                      style={{
                        backgroundColor: "var(--surface-container-highest)",
                        color: "var(--on-surface)",
                        fontSize: "var(--text-xs)",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      Copy room code
                    </Tooltip.Content>
                  </Tooltip>
                )}
              </div>
              {roomError && (
                <Alert color="error" variant="ghost" className="mt-1.5 py-1 px-2" style={{ borderRadius: "var(--radius-md)" }}>
                  <Alert.Content>
                    <Typography id="room-error" role="alert" style={{ fontSize: "var(--text-xs)" }}>{roomError}</Typography>
                  </Alert.Content>
                </Alert>
              )}
              {copied && (
                <Alert color="success" variant="ghost" className="mt-1 py-1 px-2" style={{ borderRadius: "var(--radius-md)" }}>
                  <Alert.Content>
                    <Typography style={{ fontSize: "var(--text-xs)" }}>Room code copied!</Typography>
                  </Alert.Content>
                </Alert>
              )}

              {/* Invite friends section — collapses when no room ID */}
              <Collapse open={!!roomId && !isMockMode}>
                <Button
                  variant="outline"
                  color="primary"
                  isFullWidth
                  size="sm"
                  onClick={() => setIsFriendsOpen(true)}
                  className="mt-2 font-semibold"
                  style={{ fontSize: "var(--text-xs)" }}
                >
                  Invite Friends &rarr;
                </Button>
              </Collapse>

              {/* Invited confirmation */}
              {invitedNames.length > 0 && (
                <Alert color="success" variant="ghost" className="mt-1 py-1 px-2" style={{ borderRadius: "var(--radius-md)" }}>
                  <Alert.Content>
                    <Typography style={{ fontSize: "var(--text-xs)" }}>Invited: {invitedNames.join(", ")}</Typography>
                  </Alert.Content>
                </Alert>
              )}
            </div>

            <div className="flex flex-col space-y-3">
              <Button
                onClick={handleJoin}
                disabled={!roomId}
                variant="gradient"
                color="primary"
                isFullWidth
                className="py-3.5 font-bold tracking-wide"
                style={{ fontSize: "var(--text-base)", borderRadius: "var(--radius-lg)" }}
              >
                {`Join Room${roomId ? ` \u00B7 ${roomId}` : ""}`}
              </Button>
            </div>

            <div className="pt-2" style={{ borderTop: "var(--border-subtle)" }}>
              <Button
                variant="ghost"
                isFullWidth
                onClick={() => setIsInstructionsOpen(true)}
                style={{ color: "var(--on-surface-variant)", fontSize: "var(--text-sm)" }}
              >
                How to Play
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

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
