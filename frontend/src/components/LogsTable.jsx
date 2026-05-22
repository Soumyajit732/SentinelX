import { useState } from "react";

function riskBadge(score) {
  if (score >= 70)
    return { cls: "bg-red-500/15 text-red-400 border-red-500/30", label: "HIGH" };
  if (score >= 30)
    return { cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", label: "MED" };
  return { cls: "bg-green-500/15 text-green-400 border-green-500/30", label: "LOW" };
}

function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const PAGE_SIZE = 10;

export default function LogsTable({ logs, onSelectAnomaly }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(logs.length / PAGE_SIZE);
  const slice = logs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Activity Logs</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {logs.length} entries · anomalous rows are highlighted · click to explain
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-[9px] text-slate-600 uppercase tracking-widest border-b border-slate-800">
              <th className="text-left px-5 py-3">User</th>
              <th className="text-left px-4 py-3">Endpoint</th>
              <th className="text-left px-3 py-3">Method</th>
              <th className="text-left px-3 py-3">Status</th>
              <th className="text-left px-3 py-3">Risk</th>
              <th className="text-left px-3 py-3">AI</th>
              <th className="text-left px-5 py-3">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {slice.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-12 text-slate-700 text-xs"
                >
                  No activity logs yet
                </td>
              </tr>
            ) : (
              slice.map((log) => {
                const badge = riskBadge(log.risk_score);
                return (
                  <tr
                    key={log.id}
                    onClick={() => log.is_anomaly && onSelectAnomaly?.(log)}
                    className={`transition-colors ${
                      log.is_anomaly
                        ? "bg-red-500/5 hover:bg-red-500/10 cursor-pointer"
                        : "hover:bg-slate-800/40"
                    }`}
                  >
                    <td className="px-5 py-3 text-slate-300 max-w-[130px] truncate">
                      {log.user_email}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300 max-w-[200px] truncate">
                      {log.endpoint}
                    </td>
                    <td className="px-3 py-3 text-slate-500 font-mono">
                      {log.method}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={
                          log.status_code < 400
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {log.status_code}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`border rounded px-1.5 py-0.5 text-[10px] ${badge.cls}`}
                      >
                        {log.risk_score} {badge.label}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {log.ai_explanation ? (
                        <span className="text-cyan-500 text-[10px]" title="AI explanation available">
                          ◈
                        </span>
                      ) : (
                        <span className="text-slate-700 text-[10px]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {formatTime(log.created_at)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-600">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-[10px] px-2.5 py-1 rounded bg-slate-800 text-slate-400 disabled:opacity-30 hover:bg-slate-700 transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() =>
                setPage((p) => Math.min(totalPages - 1, p + 1))
              }
              disabled={page === totalPages - 1}
              className="text-[10px] px-2.5 py-1 rounded bg-slate-800 text-slate-400 disabled:opacity-30 hover:bg-slate-700 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
