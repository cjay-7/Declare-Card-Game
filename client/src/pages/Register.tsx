import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button, Input, IconButton, Typography, Spinner, Card, Alert, Progress } from "@material-tailwind/react";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordStrength = Math.min(100, Math.round((password.length / 6) * 100));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, displayName);
      navigate("/lobby");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

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
        <Card.Header className="text-center px-6 sm:px-8 pt-8 pb-0">
          <img
            src="/logo-square.png"
            alt=""
            width={48}
            height={48}
            className="mx-auto mb-2"
            style={{ width: 48, height: 48 }}
          />
          <Typography as="h1" className="font-bold text-white tracking-wide" style={{ fontSize: "var(--text-3xl)" }}>
            Declare
          </Typography>
          <Typography className="mt-1" style={{ color: "var(--on-surface-variant)", fontSize: "var(--text-sm)" }}>
            Create your account
          </Typography>
        </Card.Header>

        <Card.Body className="px-6 sm:px-8 pt-6">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label
                htmlFor="register-name"
                className="block mb-1.5 font-medium uppercase tracking-wider"
                style={{ color: "var(--on-surface-variant)", fontSize: "var(--text-xs)" }}
              >
                Display Name
              </label>
              <Input
                id="register-name"
                type="text"
                value={displayName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
                required
                aria-required="true"
                autoComplete="username"
                maxLength={100}
                placeholder="How others see you in game"
                color="primary"
                className="dark"
              />
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="block mb-1.5 font-medium uppercase tracking-wider"
                style={{ color: "var(--on-surface-variant)", fontSize: "var(--text-xs)" }}
              >
                Email
              </label>
              <Input
                id="register-email"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                aria-required="true"
                autoComplete="email"
                placeholder="you@example.com"
                color="primary"
                className="dark"
              />
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="block mb-1.5 font-medium uppercase tracking-wider"
                style={{ color: "var(--on-surface-variant)", fontSize: "var(--text-xs)" }}
              >
                Password
              </label>
              <div className="relative">
                <Input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  required
                  aria-required="true"
                  aria-describedby="password-hint"
                  autoComplete="new-password"
                  minLength={6}
                  placeholder="Create a password"
                  color="primary"
                  className="dark pr-12"
                />
                <IconButton
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="!absolute right-2 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--on-surface-variant)" }}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </IconButton>
              </div>
              <div className="mt-2">
                <Progress
                  value={passwordStrength}
                  color={passwordStrength >= 100 ? "success" : "primary"}
                  size="sm"
                  className="h-1"
                  style={{ borderRadius: "var(--radius-full)" }}
                >
                  <Progress.Bar />
                </Progress>
                <Typography
                  id="password-hint"
                  className="mt-1"
                  style={{ color: "var(--on-surface-variant)", fontSize: "var(--text-xs)" }}
                >
                  {passwordStrength >= 100 ? "Password strength: good" : `At least 6 characters (${password.length}/6)`}
                </Typography>
              </div>
            </div>

            {error && (
              <Alert color="error" variant="ghost" className="py-2 px-3" style={{ borderRadius: "var(--radius-lg)" }}>
                <Alert.Content>
                  <Typography role="alert" aria-live="assertive" className="text-center" style={{ fontSize: "var(--text-sm)" }}>
                    {error}
                  </Typography>
                </Alert.Content>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={loading}
              variant="gradient"
              color="primary"
              isFullWidth
              className="py-3.5 font-bold tracking-wide"
              style={{ fontSize: "var(--text-base)", borderRadius: "var(--radius-lg)" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner className="w-4 h-4" />
                  Creating account&hellip;
                </span>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </Card.Body>

        <Card.Footer className="text-center px-6 sm:px-8 pb-8 pt-2">
          <Typography style={{ color: "var(--on-surface-variant)", fontSize: "var(--text-sm)" }}>
            Already have an account?{" "}
            <Link to="/login" className="font-medium hover:underline" style={{ color: "var(--primary)" }}>
              Sign in
            </Link>
          </Typography>
        </Card.Footer>
      </Card>
    </main>
  );
}
