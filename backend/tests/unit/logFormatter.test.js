const { formatActivityLog, formatActivityLogs } = require("../../src/utils/logFormatter");

describe("formatActivityLog", () => {
  const BASE = {
    user_id: "42",
    endpoint: "/api/protected/profile",
    method: "GET",
    ip_address: "192.168.1.1",
    user_agent: "Mozilla/5.0",
    status_code: 200,
    risk_score: 0,
    is_anomaly: false,
    created_at: "2024-01-15T14:30:00Z",
  };

  it("contains user id", () => {
    expect(formatActivityLog(BASE)).toContain("42");
  });

  it("contains endpoint", () => {
    expect(formatActivityLog(BASE)).toContain("/api/protected/profile");
  });

  it("uppercases method", () => {
    expect(formatActivityLog({ ...BASE, method: "get" })).toContain("GET");
  });

  it("contains ip address", () => {
    expect(formatActivityLog(BASE)).toContain("192.168.1.1");
  });

  it("contains status code", () => {
    expect(formatActivityLog(BASE)).toContain("200");
  });

  it("contains risk score", () => {
    expect(formatActivityLog(BASE)).toContain("0");
  });

  it("formats anomaly flag true as yes", () => {
    expect(formatActivityLog({ ...BASE, is_anomaly: true })).toContain("yes");
  });

  it("formats anomaly flag false as no", () => {
    expect(formatActivityLog(BASE)).toContain("no");
  });

  it("omits risk score line when absent", () => {
    const { risk_score, ...log } = BASE;
    expect(formatActivityLog(log)).not.toContain("Deterministic risk score");
  });

  it("omits anomaly line when absent", () => {
    const { is_anomaly, ...log } = BASE;
    expect(formatActivityLog(log)).not.toContain("Marked as anomaly");
  });

  it("accepts camelCase aliases", () => {
    const result = formatActivityLog({
      userId: "99",
      endpoint: "/ping",
      method: "POST",
      ipAddress: "10.0.0.1",
      userAgent: "curl/7.0",
      statusCode: 204,
    });
    expect(result).toContain("99");
    expect(result).toContain("10.0.0.1");
  });

  it("uses unknown for missing fields", () => {
    expect(formatActivityLog({})).toContain("unknown");
  });

  it("formats iso timestamp with Z suffix", () => {
    expect(formatActivityLog({ ...BASE, created_at: "2024-06-01T09:05:00Z" })).toContain(
      "2024-06-01"
    );
  });

  it("formats Date object timestamp", () => {
    const date = new Date(Date.UTC(2024, 2, 20, 8, 0, 0));
    expect(formatActivityLog({ ...BASE, created_at: date })).toContain("2024-03-20");
  });

  it("produces 'unknown time' for null timestamp", () => {
    expect(formatActivityLog({ ...BASE, created_at: null })).toContain("unknown time");
  });

  it("returns a string", () => {
    expect(typeof formatActivityLog(BASE)).toBe("string");
  });
});

describe("formatActivityLogs", () => {
  it("returns empty list for empty input", () => {
    expect(formatActivityLogs([])).toEqual([]);
  });

  it("matches input length", () => {
    const logs = [
      { user_id: "1", endpoint: "/a", method: "GET" },
      { user_id: "2", endpoint: "/b", method: "POST" },
    ];
    expect(formatActivityLogs(logs)).toHaveLength(2);
  });

  it("returns strings for each element", () => {
    const logs = [0, 1, 2].map((i) => ({ user_id: String(i) }));
    for (const item of formatActivityLogs(logs)) {
      expect(typeof item).toBe("string");
    }
  });
});
