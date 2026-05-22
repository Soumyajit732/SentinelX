import { useState, useEffect, useCallback } from "react";
import api from "../services/api";

const POLL_INTERVAL = 30_000; // refresh every 30 s

export default function useDashboard() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [riskOverTime, setRiskOverTime] = useState([]);
  const [recoveryEvents, setRecoveryEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, logsRes, anomaliesRes, riskRes, recoveryRes] =
        await Promise.all([
          api.get("/dashboard/stats"),
          api.get("/dashboard/logs"),
          api.get("/dashboard/anomalies"),
          api.get("/dashboard/risk-over-time"),
          api.get("/dashboard/recovery-events"),
        ]);

      setStats(statsRes.data);
      setLogs(logsRes.data);
      setAnomalies(anomaliesRes.data);
      setRiskOverTime(riskRes.data);
      setRecoveryEvents(recoveryRes.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return {
    stats,
    logs,
    anomalies,
    riskOverTime,
    recoveryEvents,
    loading,
    error,
    refetch: fetchAll,
  };
}
