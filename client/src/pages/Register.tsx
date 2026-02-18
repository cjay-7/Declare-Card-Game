import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#262626] p-4">
      <div
        className="border border-white/10 rounded-2xl p-8 w-full max-w-md"
        style={{ backgroundColor: "var(--surface-container)", boxShadow: "var(--elevation-2)" }}
      >
        <div className="text-center mb-8">
          <img src="/logo-square.png" alt="" width={48} height={48} className="mx-auto mb-1" style={{ width: 48, height: 48 }} />
          <h1 className="text-3xl font-bold text-white tracking-wide">Declare</h1>
          <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="register-name" className="block mb-1.5 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--on-surface-variant)" }}>
              Display Name
            </label>
            <input
              id="register-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              aria-required="true"
              autoComplete="username"
              maxLength={100}
              className="w-full px-4 py-3 text-white rounded-xl border border-white/10 focus:outline-none focus-visible:outline-2 focus-visible:outline-amber-500 focus-visible:outline-offset-2 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 placeholder-gray-600 transition-all"
              style={{ backgroundColor: "var(--surface-container-highest)" }}
              placeholder="How others see you in game"
            />
          </div>

          <div>
            <label htmlFor="register-email" className="block mb-1.5 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--on-surface-variant)" }}>
              Email
            </label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-required="true"
              autoComplete="email"
              className="w-full px-4 py-3 text-white rounded-xl border border-white/10 focus:outline-none focus-visible:outline-2 focus-visible:outline-amber-500 focus-visible:outline-offset-2 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 placeholder-gray-600 transition-all"
              style={{ backgroundColor: "var(--surface-container-highest)" }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="block mb-1.5 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--on-surface-variant)" }}>
              Password
            </label>
            <div className="relative">
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-required="true"
                aria-describedby="password-hint"
                autoComplete="new-password"
                minLength={6}
                className="w-full px-4 py-3 pr-12 text-white rounded-xl border border-white/10 focus:outline-none focus-visible:outline-2 focus-visible:outline-amber-500 focus-visible:outline-offset-2 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 placeholder-gray-600 transition-all"
                style={{ backgroundColor: "var(--surface-container-highest)" }}
                placeholder="Create a password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
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
              </button>
            </div>
            <p id="password-hint" className="text-xs mt-1.5" style={{ color: "var(--on-surface-variant)" }}>
              At least 6 characters
            </p>
          </div>

          {error && (
            <p role="alert" aria-live="assertive" className="text-sm text-center rounded-lg py-2 px-3" style={{ color: "var(--error)", backgroundColor: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-base tracking-wide transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98]"
            style={{
              color: "var(--on-primary)",
              background: loading
                ? "var(--surface-container-high)"
                : "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)",
              boxShadow: loading ? "none" : "0 4px 20px rgba(245, 158, 11, 0.35)",
            }}
          >
            {loading ? "Creating account\u2026" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: "var(--on-surface-variant)" }}>
          Already have an account?{" "}
          <Link to="/login" className="text-amber-400 hover:text-amber-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
