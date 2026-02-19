import { useState, useEffect, useRef } from "react";
import socket from "../socket";
import { Button, Typography, Alert, Progress, Avatar } from "@material-tailwind/react";

interface Invite {
  fromDisplayName: string;
  fromUserId: string;
  roomId: string;
}

interface InviteNotificationProps {
  onJoin: (roomId: string) => void;
}

const DISMISS_MS = 15000;

export default function InviteNotification({ onJoin }: InviteNotificationProps) {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const handleInvite = (data: Invite) => {
      setInvite(data);
      setElapsed(0);
    };

    socket.on("game-invite", handleInvite);
    return () => {
      socket.off("game-invite", handleInvite);
    };
  }, []);

  // Auto-dismiss countdown with progress tracking
  useEffect(() => {
    if (!invite) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev >= DISMISS_MS) {
          setInvite(null);
          return 0;
        }
        return prev + 100;
      });
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [invite]);

  if (!invite) return null;

  const remaining = Math.max(0, 100 - (elapsed / DISMISS_MS) * 100);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full px-4" style={{ maxWidth: "var(--container-sm)" }} role="alert">
      <Alert
        color="warning"
        variant="outline"
        className="p-4"
        style={{
          backgroundColor: "var(--surface-container)",
          boxShadow: "0 8px 32px rgba(245,158,11,0.2)",
          borderColor: "rgba(245, 158, 11, 0.3)",
          borderRadius: "var(--radius-2xl)",
        }}
      >
        <div className="flex items-start gap-3">
          <Alert.Icon className="mt-0.5">
            <Avatar
              as="div"
              alt={invite.fromDisplayName}
              size="sm"
              className="bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center rounded-full"
              style={{ fontSize: "var(--text-sm)" }}
            >
              {invite.fromDisplayName[0]?.toUpperCase() ?? "?"}
            </Avatar>
          </Alert.Icon>
          <Alert.Content className="flex-1 min-w-0">
            <Typography className="text-white font-semibold" style={{ fontSize: "var(--text-sm)" }}>
              {invite.fromDisplayName} invited you to a game!
            </Typography>
            <Typography className="mt-0.5" style={{ color: "var(--on-surface-variant)", fontSize: "var(--text-xs)" }}>
              Room: {invite.roomId}
            </Typography>
          </Alert.Content>
          <Alert.DismissTrigger
            onClick={() => setInvite(null)}
            aria-label="Dismiss invitation"
            className="flex-shrink-0"
            style={{ color: "var(--on-surface-variant)" }}
          />
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            variant="gradient"
            color="primary"
            className="flex-1 font-bold"
            style={{ fontSize: "var(--text-sm)", borderRadius: "var(--radius-lg)" }}
            onClick={() => {
              onJoin(invite.roomId);
              setInvite(null);
            }}
          >
            Join Game
          </Button>
          <Button
            variant="ghost"
            onClick={() => setInvite(null)}
            className="px-4"
            style={{ color: "var(--on-surface-variant)", fontSize: "var(--text-sm)" }}
          >
            Dismiss
          </Button>
        </div>
        <Progress value={remaining} color="primary" size="sm" className="h-1 mt-3 opacity-60" style={{ borderRadius: "var(--radius-full)" }}>
          <Progress.Bar />
        </Progress>
      </Alert>
    </div>
  );
}
