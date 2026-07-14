jest.mock("../../src/db/pool");
jest.mock("../../src/services/baselineService");

const { getRiskLevel, calculateRisk } = require("../../src/services/riskService");
const db = require("../../src/db/pool");
const baselineService = require("../../src/services/baselineService");

// ─── getRiskLevel (pure) ───────────────────────────────────────────────────

describe("getRiskLevel", () => {
  it.each([
    [0, "LOW"],
    [29, "LOW"],
    [30, "MEDIUM"],
    [69, "MEDIUM"],
    [70, "HIGH"],
    [100, "HIGH"],
  ])("score %i → %s", (score, expected) => {
    expect(getRiskLevel(score)).toBe(expected);
  });
});

// ─── calculateRisk ────────────────────────────────────────────────────────

describe("calculateRisk", () => {
  const userId = "user-123";
  const endpoint = "/api/protected/profile";
  const timestamp = new Date("2024-01-15T10:00:00Z");
  // getHours() returns local time — derive it from the same timestamp so mocks are consistent
  const requestHour = timestamp.getHours();
  const otherHour = (requestHour + 6) % 24; // guaranteed != requestHour

  function mockBaselines({
    activeHours = [requestHour],
    commonEndpoints = [endpoint],
    avgRequestsPerHour = 5,
    recentRequestCount = 2,
    hasEnoughData = true,
  } = {}) {
    baselineService.getActiveHoursBaseline.mockResolvedValue({
      hasEnoughData,
      activeHours,
    });
    baselineService.getCommonEndpointsBaseline.mockResolvedValue({
      hasEnoughData,
      commonEndpoints,
    });
    baselineService.getRequestRateBaseline.mockResolvedValue({
      hasEnoughData,
      avgRequestsPerHour,
    });
    db.query.mockResolvedValue({ rows: [{ request_count: recentRequestCount }] });
  }

  beforeEach(() => jest.resetAllMocks());

  it("returns riskScore 0 and LOW when no signals fire", async () => {
    mockBaselines();
    const result = await calculateRisk({ userId, endpoint, timestamp });

    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe("LOW");
    expect(result.triggeredSignals).toHaveLength(0);
  });

  it("triggers OUTSIDE_ACTIVE_HOURS (+40) when request hour absent from baseline", async () => {
    mockBaselines({ activeHours: [otherHour] });
    const result = await calculateRisk({ userId, endpoint, timestamp });

    expect(result.triggeredSignals).toContainEqual(
      expect.objectContaining({ signal: "OUTSIDE_ACTIVE_HOURS", score: 40 })
    );
    expect(result.riskScore).toBe(40);
  });

  it("triggers RARE_ENDPOINT (+35) when endpoint absent from baseline", async () => {
    mockBaselines({ commonEndpoints: ["/api/protected/dashboard"] });
    const result = await calculateRisk({ userId, endpoint, timestamp });

    expect(result.triggeredSignals).toContainEqual(
      expect.objectContaining({ signal: "RARE_ENDPOINT", score: 35 })
    );
    expect(result.riskScore).toBe(35);
  });

  it("triggers REQUEST_SPIKE (+35) when recent count exceeds 3× avg (min 10)", async () => {
    // avg=5 → threshold=max(15,10)=15; recent=20 triggers spike
    mockBaselines({ avgRequestsPerHour: 5, recentRequestCount: 20 });
    const result = await calculateRisk({ userId, endpoint, timestamp });

    expect(result.triggeredSignals).toContainEqual(
      expect.objectContaining({ signal: "REQUEST_SPIKE", score: 35 })
    );
  });

  it("does NOT trigger REQUEST_SPIKE when recent count is at or below threshold", async () => {
    // avg=5 → threshold=15; recent=15 does NOT exceed it
    mockBaselines({ avgRequestsPerHour: 5, recentRequestCount: 15 });
    const result = await calculateRisk({ userId, endpoint, timestamp });

    const signals = result.triggeredSignals.map((s) => s.signal);
    expect(signals).not.toContain("REQUEST_SPIKE");
  });

  it("scores 75 (HIGH) when OUTSIDE_ACTIVE_HOURS + RARE_ENDPOINT both fire", async () => {
    mockBaselines({
      activeHours: [otherHour],
      commonEndpoints: ["/api/protected/dashboard"],
    });
    const result = await calculateRisk({ userId, endpoint, timestamp });

    expect(result.riskScore).toBe(75);
    expect(result.riskLevel).toBe("HIGH");
    expect(result.triggeredSignals).toHaveLength(2);
  });

  it("scores 70 (HIGH) when RARE_ENDPOINT + REQUEST_SPIKE both fire, with no hour signal", async () => {
    // proves HIGH is reachable without the hour-based signal
    mockBaselines({
      commonEndpoints: ["/api/protected/dashboard"],
      avgRequestsPerHour: 5,
      recentRequestCount: 20,
    });
    const result = await calculateRisk({ userId, endpoint, timestamp });

    expect(result.riskScore).toBe(70);
    expect(result.riskLevel).toBe("HIGH");
    expect(result.triggeredSignals).toHaveLength(2);
  });

  it("caps riskScore at 100 when all three signals fire", async () => {
    mockBaselines({
      activeHours: [otherHour],
      commonEndpoints: ["/api/protected/dashboard"],
      avgRequestsPerHour: 5,
      recentRequestCount: 20,
    });
    const result = await calculateRisk({ userId, endpoint, timestamp });

    expect(result.riskScore).toBe(100);
    expect(result.riskLevel).toBe("HIGH");
    expect(result.triggeredSignals).toHaveLength(3);
  });

  it("suppresses all signals when hasEnoughData is false", async () => {
    mockBaselines({
      hasEnoughData: false,
      activeHours: [14, 15, 16],
      commonEndpoints: ["/other"],
      avgRequestsPerHour: 100,
      recentRequestCount: 999,
    });
    const result = await calculateRisk({ userId, endpoint, timestamp });

    expect(result.riskScore).toBe(0);
    expect(result.triggeredSignals).toHaveLength(0);
  });

  it("echoes userId and endpoint back in the result", async () => {
    mockBaselines();
    const result = await calculateRisk({ userId, endpoint, timestamp });

    expect(result.userId).toBe(userId);
    expect(result.endpoint).toBe(endpoint);
  });
});
