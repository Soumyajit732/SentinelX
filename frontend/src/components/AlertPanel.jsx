function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function riskCls(score) {
  if (score >= 70) return "text-red-400 border-red-500/30 bg-red-500/10";
  if (score >= 30) return "text-amber-400 border-amber-500/30 bg-amber-500/10";
  return "text-green-400 border-green-500/30 bg-green-500/10";
}

export default function AlertPanel({ anomalies, onSelect, selected }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Recent Anomalies
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Click to view AI explanation
          </p>
        </div>
        {anomalies.length > 0 && (
          <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 rounded-full px-2 py-0.5 shrink-0">
            {anomalies.length} alerts
          </span>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/70">
        {anomalies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-10 gap-1">
            <p className="text-xs text-slate-600">No anomalies detected</p>
            <p className="text-[10px] text-green-500">System healthy ✓</p>
          </div>
        ) : (
          anomalies.map((a) => (
            <button
              key={a.id}
              onClick={() => onSelect(a)}
              className={`w-full text-left p-4 hover:bg-slate-800 transition-colors ${
                selected?.id === a.id
                  ? "bg-slate-800 border-l-2 border-l-cyan-500 pl-3.5"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-[11px] text-slate-200 font-mono truncate">
                  {a.endpoint}
                </span>
                <span
                  className={`text-[10px] border rounded px-1.5 py-0.5 shrink-0 ${riskCls(a.risk_score)}`}
                >
                  {a.risk_score}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 truncate">
                  {a.user_email}
                </span>
                <span className="text-[10px] text-slate-600 shrink-0">
                  {timeAgo(a.created_at)}
                </span>
              </div>
              {a.ai_explanation && (
                <p className="text-[10px] text-cyan-500/70 mt-1.5 truncate">
                  ◈ AI explanation available
                </p>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
