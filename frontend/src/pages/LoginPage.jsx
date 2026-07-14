import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      login(res.data.token, res.data.user);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    setError("");
    setDemoLoading(true);
    try {
      const res = await api.post("/auth/demo-login");
      login(res.data.token, res.data.user, { demo: true });
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message ?? "Unable to start demo session");
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl mb-4">
            <span className="text-2xl font-black text-cyan-400 tracking-tight">
              SX
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-100">SentinelX</h1>
          <p className="text-xs text-slate-500 mt-1">
            Zero-Trust Identity Intelligence Platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-slate-100">
            Security Access
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5 mb-5">
            Authenticate to enter the SOC dashboard
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                placeholder="operator@sentinelx.io"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-cyan-500/60 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-cyan-500/60 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-[11px] text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-lg py-2.5 transition-colors"
            >
              {loading ? "Authenticating…" : "Access Dashboard"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px bg-slate-800 flex-1" />
            <span className="text-[10px] text-slate-600 uppercase tracking-wider">or</span>
            <div className="h-px bg-slate-800 flex-1" />
          </div>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold text-sm rounded-lg py-2.5 transition-colors border border-slate-700"
          >
            {demoLoading ? "Starting demo…" : "Try Demo (no account needed)"}
          </button>
          <p className="text-[10px] text-slate-600 mt-2 text-center">
            Instantly logs you into a live sandbox account with a pre-seeded
            behavioral baseline.
          </p>
        </div>

        <p className="text-center text-[10px] text-slate-800 mt-5">
          SentinelX v0.7.0 · Phase 7 · Zero-Trust
        </p>
      </div>
    </div>
  );
}
