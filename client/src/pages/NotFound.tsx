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
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#262626] p-4 text-center">
      <Card className="border border-white/10 w-full max-w-md p-8" style={{ backgroundColor: "var(--surface-container)", boxShadow: "var(--elevation-2)" }}>
        <Card.Body className="flex flex-col items-center">
          <div className="text-8xl mb-6 opacity-80">
            <span className="inline-block rotate-12">?</span>
          </div>

          <Typography as="h1" className="text-4xl font-bold text-white mb-2">Lost Card</Typography>

          <Alert color="warning" variant="ghost" className="mb-6 w-full">
            <Alert.Content>
              <Typography className="text-sm text-center">
                This page doesn't exist. Looks like someone shuffled it out of the deck.
              </Typography>
            </Alert.Content>
          </Alert>

          <Button
            onClick={() => navigate(destination, { replace: true })}
            variant="gradient"
            color="primary"
            className="px-8 py-3 font-bold text-base"
          >
            Back to {user ? "Lobby" : "Login"}
          </Button>

          <div className="w-full mt-6 space-y-2">
            <Progress value={(countdown / 4) * 100} color="primary" size="sm" className="h-1.5">
              <Progress.Bar />
            </Progress>
            <Typography aria-live="polite" className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
              Redirecting in {countdown}s...
            </Typography>
          </div>
        </Card.Body>
      </Card>
    </main>
  );
}
