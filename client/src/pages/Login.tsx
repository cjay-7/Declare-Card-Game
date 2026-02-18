import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/lobby");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#262626] p-4">
      <div className="bg-[#1a1a1a] border border-white/10 shadow-2xl rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo-square.png" alt="Declare" width={48} height={48} className="mx-auto mb-1" style={{ width: 48, height: 48 }} />
          <h1 className="text-3xl font-bold text-white tracking-wide">Declare</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to play</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-400 mb-1.5 text-xs font-semibold uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#2a2a2a] text-white rounded-xl border border-white/10 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 placeholder-gray-600 transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-1.5 text-xs font-semibold uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#2a2a2a] text-white rounded-xl border border-white/10 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 placeholder-gray-600 transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-[#1a1a1a] text-base tracking-wide transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: loading
                ? "#6b7280"
                : "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)",
              boxShadow: loading ? "none" : "0 4px 20px rgba(245, 158, 11, 0.35)",
            }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          No account?{" "}
          <Link to="/register" className="text-amber-400 hover:text-amber-300 transition-colors">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
