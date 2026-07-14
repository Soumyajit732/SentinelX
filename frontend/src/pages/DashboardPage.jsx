import { useState } from "react";
import useDashboard from "../hooks/useDashboard";
import { useAuth } from "../context/AuthContext";
import StatCards from "../components/StatCards";
import RiskChart from "../components/RiskChart";
import AlertPanel from "../components/AlertPanel";
import ExplanationCard from "../components/ExplanationCard";
import LogsTable from "../components/LogsTable";
import DemoControls from "../components/DemoControls";
import api from "../services/api";

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading security data…</p>
      </div>
    </div>
  );
}

function ErrorState({ error, isDemo, onRetry, onRestartDemo }) {
  const isSessionIssue =
    error.status === 401 &&
    (error.code === "SESSION_INVALIDATED" || error.code === "TEMP_BLOCKED");

  if (isDemo && isSessionIssue) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-sm">
          <p className="text-amber-400 text-sm mb-1">Demo session ended</p>
          <p className="text-slate-600 text-xs mb-5">
            A HIGH-risk event triggered auto-mitigation, which invalidated this
            session — that's the zero-trust engine working as designed. Start
            a fresh demo session to keep exploring.
          </p>
          <button
            onClick={onRestartDemo}
            className="text-xs font-semibold px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg transition-colors"
          >
            Restart Demo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-red-400 text-sm mb-1">Failed to load dashboard</p>
        <p className="text-slate-600 text-xs mb-5">{error.message}</p>
        <button
          onClick={onRetry}
          className="text-xs px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { stats, logs, anomalies, riskOverTime, loading, error, refetch } =
    useDashboard();
  const { isDemo, login } = useAuth();

  const [selectedAnomaly, setSelectedAnomaly] = useState(null);

  async function restartDemo() {
    const res = await api.post("/auth/demo-login");
    login(res.data.token, res.data.user, { demo: true });
    refetch();
  }

  if (loading) return <LoadingState />;
  if (error) {
    return (
      <ErrorState
        error={error}
        isDemo={isDemo}
        onRetry={refetch}
        onRestartDemo={restartDemo}
      />
    );
  }

  return (
    <div className="space-y-5 max-w-screen-2xl mx-auto">
      {isDemo && <DemoControls onActivity={refetch} />}

      {/* Row 1 — KPI cards */}
      <StatCards stats={stats} />

      {/* Row 2 — Chart + Alert panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <RiskChart data={riskOverTime} />
        </div>
        <div className="lg:col-span-1 min-h-72">
          <AlertPanel
            anomalies={anomalies}
            onSelect={setSelectedAnomaly}
            selected={selectedAnomaly}
          />
        </div>
      </div>

      {/* Row 3 — AI Explanation (visible only when an anomaly is selected) */}
      {selectedAnomaly && (
        <ExplanationCard
          anomaly={selectedAnomaly}
          onClose={() => setSelectedAnomaly(null)}
        />
      )}

      {/* Row 4 — Full activity log table */}
      <LogsTable logs={logs} onSelectAnomaly={setSelectedAnomaly} />
    </div>
  );
}
