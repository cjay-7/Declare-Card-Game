import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function NotFound() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(4);

  const destination = user ? "/lobby" : "/login";

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(destination, { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate, destination]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#262626] p-4 text-center">
      <div className="text-8xl mb-6 opacity-80">
        <span className="inline-block rotate-12">?</span>
      </div>

      <h1 className="text-4xl font-bold text-white mb-2">Lost Card</h1>
      <p className="text-lg mb-8 max-w-sm" style={{ color: "var(--on-surface-variant)" }}>
        This page doesn't exist. Looks like someone shuffled it out of the deck.
      </p>

      <button
        onClick={() => navigate(destination, { replace: true })}
        className="px-8 py-3 rounded-xl font-bold text-base transition-all hover:brightness-110 active:scale-[0.98]"
        style={{
          color: "var(--on-primary)",
          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)",
          boxShadow: "0 4px 20px rgba(245, 158, 11, 0.35)",
        }}
      >
        Back to {user ? "Lobby" : "Login"}
      </button>

      <p aria-live="polite" className="text-sm mt-6" style={{ color: "var(--on-surface-variant)" }}>
        Redirecting in {countdown}s...
      </p>
    </main>
  );
}
