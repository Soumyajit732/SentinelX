import { useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

// Each call gets a unique query string, so the risk engine sees a brand-new
// "endpoint" every time (RARE_ENDPOINT fires on every call) — this mirrors a
// real attack pattern: a script enumerating distinct admin resources rapidly.
// Combined with REQUEST_SPIKE once enough volume lands within the lookback
// window, it reliably crosses the HIGH threshold within ~12-15 requests.
const SUSPICIOUS_BASE_PATH = "/protected/admin/export-all";
const MAX_BURST_REQUESTS = 20;

export default function DemoControls({ onActivity }) {
  const { login } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [terminated, setTerminated] = useState(false);

  async function simulateNormal() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await api.get("/protected/profile");
      setStatus({ ok: true, message: `${res.status} — ${res.data.message}` });
    } catch (err) {
      handleRequestError(err);
    } finally {
      setLoading(false);
      onActivity?.();
    }
  }

  function handleRequestError(err) {
    const response = err.response;
    if (response?.status === 401 && response.data?.code === "SESSION_INVALIDATED") {
      setTerminated(true);
      setStatus({ ok: false, message: "Session invalidated by a prior HIGH-risk event." });
    } else if (response?.status === 403 && response.data?.code === "SESSION_TERMINATED") {
      setTerminated(true);
      setStatus({
        ok: false,
        message: "403 — SESSION_TERMINATED (HIGH risk: auto-mitigation kicked in)",
      });
    } else if (response?.status === 401 && response.data?.code === "REAUTH_REQUIRED") {
      setStatus({ ok: false, message: "401 — REAUTH_REQUIRED (MEDIUM risk detected)" });
    } else {
      setStatus({ ok: false, message: response?.data?.message ?? "Request failed" });
    }
  }

  async function simulateSuspicious() {
    setLoading(true);
    setStatus({ ok: true, message: "Firing rapid probe burst against admin endpoints…" });

    for (let i = 0; i < MAX_BURST_REQUESTS; i++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await api.get(`${SUSPICIOUS_BASE_PATH}?probe=${Date.now()}-${i}`);
      } catch (err) {
        const response = err.response;
        if (response?.status === 403 && response.data?.code === "SESSION_TERMINATED") {
          setTerminated(true);
          setStatus({
            ok: false,
            message: `403 — SESSION_TERMINATED after ${i + 1} requests (HIGH risk: rare endpoint + request spike)`,
          });
          break;
        }
        if (response?.status === 401 && response.data?.code === "SESSION_INVALIDATED") {
          setTerminated(true);
          setStatus({ ok: false, message: "Session invalidated by a prior HIGH-risk event." });
          break;
        }
        // MEDIUM (REAUTH_REQUIRED) responses are expected mid-burst — keep going.
      }
    }

    setLoading(false);
    onActivity?.();
  }

  async function reactivateDemo() {
    setLoading(true);
    setStatus(null);
    try {
      // Reactivate (not demo-login) — restores access without wiping the
      // activity history the burst just generated, so the anomaly and its
      // AI explanation are still there to review.
      const res = await api.post("/auth/demo-reactivate");
      login(res.data.token, res.data.user, { demo: true });
      setTerminated(false);
      onActivity?.();
    } catch {
      setStatus({ ok: false, message: "Unable to reactivate demo session" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-900 border border-cyan-500/20 rounded-xl p-5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-cyan-400 uppercase tracking-wider font-semibold">
          Demo Controls
        </p>
        {terminated && (
          <span className="text-[10px] text-red-400 uppercase tracking-wider">
            Session terminated
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-500 mb-4">
        Fire real requests through the live risk engine and watch the dashboard react.
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={simulateNormal}
          disabled={loading || terminated}
          className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 transition-colors"
        >
          Simulate Normal Request
        </button>
        <button
          onClick={simulateSuspicious}
          disabled={loading || terminated}
          className="text-xs font-semibold px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 text-red-400 border border-red-500/20 transition-colors"
        >
          Simulate Suspicious Request
        </button>
        {terminated && (
          <button
            onClick={reactivateDemo}
            disabled={loading}
            className="text-xs font-semibold px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 transition-colors"
          >
            Reactivate & Review
          </button>
        )}
      </div>

      {status && (
        <p className={`text-[11px] mt-3 ${status.ok ? "text-slate-400" : "text-amber-400"}`}>
          → {status.message}
        </p>
      )}
    </div>
  );
}
