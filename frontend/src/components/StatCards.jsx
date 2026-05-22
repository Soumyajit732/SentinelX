const CARDS = [
  {
    key: "total_requests",
    label: "Total Requests",
    sub: "Last 24 hours",
    icon: "◈",
    color: "cyan",
  },
  {
    key: "anomaly_count",
    label: "Anomalies",
    sub: "Last 24 hours",
    icon: "⚠",
    color: "red",
  },
  {
    key: "avg_risk_score",
    label: "Avg Risk Score",
    sub: "Last 24 hours",
    suffix: "/100",
    icon: "◉",
    color: "amber",
  },
  {
    key: "blocked_users",
    label: "Blocked Users",
    sub: "Currently active",
    icon: "⊘",
    color: "red",
  },
];

const COLORS = {
  cyan: {
    border: "border-cyan-500/20",
    icon: "bg-cyan-500/10 text-cyan-400",
    value: "text-cyan-400",
  },
  red: {
    border: "border-red-500/20",
    icon: "bg-red-500/10 text-red-400",
    value: "text-red-400",
  },
  amber: {
    border: "border-amber-500/20",
    icon: "bg-amber-500/10 text-amber-400",
    value: "text-amber-400",
  },
};

function Skeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-28 animate-pulse"
        />
      ))}
    </div>
  );
}

export default function StatCards({ stats }) {
  if (!stats) return <Skeleton />;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map(({ key, label, sub, icon, color, suffix }) => {
        const c = COLORS[color];
        return (
          <div
            key={key}
            className={`bg-slate-900 border ${c.border} rounded-xl p-5`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                {label}
              </p>
              <div
                className={`w-8 h-8 rounded-lg ${c.icon} flex items-center justify-center text-base leading-none`}
              >
                {icon}
              </div>
            </div>
            <p className={`text-2xl font-bold ${c.value}`}>
              {stats[key] ?? "—"}
              {suffix && (
                <span className="text-sm font-normal text-slate-600">
                  {suffix}
                </span>
              )}
            </p>
            <p className="text-[10px] text-slate-600 mt-1">{sub}</p>
          </div>
        );
      })}
    </div>
  );
}
