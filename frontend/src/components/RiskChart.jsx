import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function formatHour(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload ?? {};
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-[11px] shadow-xl">
      <p className="text-slate-400 mb-2 font-mono">{formatHour(label)}</p>
      <p className="text-cyan-400">
        Avg risk:{" "}
        <span className="font-bold">{payload[0]?.value ?? "—"}</span>
      </p>
      <p className="text-red-400">
        Anomalies:{" "}
        <span className="font-bold">{payload[1]?.value ?? 0}</span>
      </p>
      <p className="text-slate-500">
        Requests:{" "}
        <span className="font-bold text-slate-300">
          {row.request_count ?? 0}
        </span>
      </p>
    </div>
  );
}

export default function RiskChart({ data }) {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-slate-100">
          Risk Score Over Time
        </h2>
        <p className="text-[10px] text-slate-500 mt-0.5">
          Last 24 hours — averaged per hour
        </p>
      </div>

      {!hasData ? (
        <div className="h-48 flex items-center justify-center">
          <p className="text-xs text-slate-700 text-center">
            No activity yet — data will appear once requests are logged
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gRisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gAnom" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="hour"
              tickFormatter={formatHour}
              tick={{ fill: "#475569", fontSize: 10 }}
              axisLine={{ stroke: "#1e293b" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#475569", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="avg_risk"
              stroke="#06b6d4"
              strokeWidth={2}
              fill="url(#gRisk)"
              dot={false}
              activeDot={{ r: 4, fill: "#06b6d4", strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="anomaly_count"
              stroke="#ef4444"
              strokeWidth={1.5}
              fill="url(#gAnom)"
              dot={false}
              activeDot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      <div className="flex gap-5 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-px bg-cyan-400" />
          <span className="text-[10px] text-slate-500">Avg Risk Score</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-px bg-red-400" />
          <span className="text-[10px] text-slate-500">Anomaly Count</span>
        </div>
      </div>
    </div>
  );
}
