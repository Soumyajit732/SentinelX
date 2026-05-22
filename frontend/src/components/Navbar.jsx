import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-sm font-semibold text-slate-100">
          Security Operations Dashboard
        </h1>
        <p className="text-[10px] text-slate-500">
          AI-Enhanced Zero-Trust Identity Intelligence · Phase 7
        </p>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-[11px] text-slate-400">Live — 30s refresh</span>
        </div>

        <button
          onClick={handleLogout}
          className="text-[11px] text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-red-500/40 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
