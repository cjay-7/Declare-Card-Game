import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button, Typography, Card, Progress, Alert } from "@material-tailwind/react";

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
    <main className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 text-center" style={{ backgroundColor: "var(--surface)" }}>
      <Card
        className="w-full border p-8"
        style={{
          maxWidth: "var(--container-md)",
          backgroundColor: "var(--surface-container)",
          boxShadow: "var(--elevation-2)",
          borderColor: "rgba(255, 255, 255, 0.1)",
          borderRadius: "var(--radius-2xl)",
        }}
      >
        <Card.Body className="flex flex-col items-center">
          <div className="mb-6 opacity-80" style={{ fontSize: "var(--text-4xl)" }}>
            <span className="inline-block rotate-12 text-7xl sm:text-8xl">?</span>
          </div>

          <Typography as="h1" className="font-bold text-white mb-2" style={{ fontSize: "var(--text-4xl)" }}>
            Lost Card
          </Typography>

          <Alert color="warning" variant="ghost" className="mb-6 w-full" style={{ borderRadius: "var(--radius-lg)" }}>
            <Alert.Content>
              <Typography className="text-center" style={{ fontSize: "var(--text-sm)" }}>
                This page doesn't exist. Looks like someone shuffled it out of the deck.
              </Typography>
            </Alert.Content>
          </Alert>

          <Button
            onClick={() => navigate(destination, { replace: true })}
            variant="gradient"
            color="primary"
            className="px-8 py-3 font-bold"
            style={{ fontSize: "var(--text-base)", borderRadius: "var(--radius-lg)" }}
          >
            Back to {user ? "Lobby" : "Login"}
          </Button>

          <div className="w-full mt-6 space-y-2">
            <Progress value={(countdown / 4) * 100} color="primary" size="sm" className="h-1.5" style={{ borderRadius: "var(--radius-full)" }}>
              <Progress.Bar />
            </Progress>
            <Typography aria-live="polite" style={{ color: "var(--on-surface-variant)", fontSize: "var(--text-sm)" }}>
              Redirecting in {countdown}s...
            </Typography>
          </div>
        </Card.Body>
      </Card>
    </main>
  );
}
