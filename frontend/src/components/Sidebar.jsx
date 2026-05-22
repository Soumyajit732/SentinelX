import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
      {/* Brand */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-slate-950 font-black text-sm tracking-tight">SX</span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-100 leading-none">SentinelX</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">
              Zero-Trust
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3">
        <p className="text-[9px] text-slate-700 uppercase tracking-widest px-3 py-2">
          Navigation
        </p>
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            }`
          }
        >
          <span className="text-base leading-none">◈</span>
          Dashboard
        </NavLink>
      </nav>

      {/* User badge */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] text-slate-300 truncate">
              {user?.email ?? "operator"}
            </p>
            <p className="text-[9px] text-slate-600">Active session</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
