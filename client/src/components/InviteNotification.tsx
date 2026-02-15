import { useState, useEffect } from "react";
import socket from "../socket";

interface Invite {
  fromDisplayName: string;
  fromUserId: string;
  roomId: string;
}

interface InviteNotificationProps {
  onJoin: (roomId: string) => void;
}

export default function InviteNotification({ onJoin }: InviteNotificationProps) {
  const [invite, setInvite] = useState<Invite | null>(null);

  useEffect(() => {
    const handleInvite = (data: Invite) => {
      setInvite(data);
    };

    socket.on("game-invite", handleInvite);
    return () => {
      socket.off("game-invite", handleInvite);
    };
  }, []);

  // Auto-dismiss after 15 seconds
  useEffect(() => {
    if (!invite) return;
    const timer = setTimeout(() => setInvite(null), 15000);
    return () => clearTimeout(timer);
  }, [invite]);

  if (!invite) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div
        className="bg-[#1a1a1a] border border-amber-500/30 rounded-2xl p-4 shadow-2xl"
        style={{ boxShadow: "0 8px 32px rgba(245,158,11,0.2)" }}
      >
        <div className="flex items-start gap-3">
          <div className="text-2xl mt-0.5">🎴</div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold">
              {invite.fromDisplayName} invited you to a game!
            </p>
            <p className="text-gray-400 text-xs mt-0.5">Room: {invite.roomId}</p>
          </div>
          <button
            onClick={() => setInvite(null)}
            className="text-gray-500 hover:text-gray-300 transition-colors text-lg leading-none flex-shrink-0"
          >
            ×
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => {
              onJoin(invite.roomId);
              setInvite(null);
            }}
            className="flex-1 py-2 rounded-xl font-bold text-[#1a1a1a] text-sm transition-all"
            style={{ background: "linear-gradient(135deg, #f59e0b, #b45309)" }}
          >
            Join Game
          </button>
          <button
            onClick={() => setInvite(null)}
            className="px-4 py-2 rounded-xl text-sm text-gray-400 bg-white/5 hover:bg-white/10 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
