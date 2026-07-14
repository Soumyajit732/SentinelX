const { cosineSimilarity, topKSimilar } = require("../../src/services/explanationService");

// deterministic pseudo-random unit vectors, mirroring the FAISS test fixtures
function makeEmbeddings(n, dim = 16, seed = 1) {
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  const vecs = [];
  for (let i = 0; i < n; i++) {
    const v = Array.from({ length: dim }, rand);
    const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
    vecs.push(v.map((x) => x / norm));
  }
  return vecs;
}

function makeLogs(n) {
  return Array.from({ length: n }, (_, i) => ({ id: i, endpoint: `/ep/${i}` }));
}

describe("cosineSimilarity", () => {
  it("is 1 for identical unit vectors", () => {
    const [v] = makeEmbeddings(1);
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 6);
  });

  it("is symmetric", () => {
    const [a, b] = makeEmbeddings(2);
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 10);
  });
});

describe("topKSimilar", () => {
  it("returns at most k results", () => {
    const logs = makeLogs(10);
    const embeddings = makeEmbeddings(10);
    const results = topKSimilar(makeEmbeddings(1, 16, 2)[0], embeddings, logs, 3);
    expect(results).toHaveLength(3);
  });

  it("clamps k to the number of available logs", () => {
    const logs = makeLogs(2);
    const embeddings = makeEmbeddings(2);
    const results = topKSimilar(makeEmbeddings(1, 16, 2)[0], embeddings, logs, 100);
    expect(results).toHaveLength(2);
  });

  it("returns original log objects", () => {
    const logs = makeLogs(5);
    const embeddings = makeEmbeddings(5);
    const results = topKSimilar(embeddings[0], embeddings, logs, 1);
    expect(results[0]).toHaveProperty("id");
  });

  it("ranks the exact matching embedding as the nearest neighbor", () => {
    const logs = makeLogs(5);
    const embeddings = makeEmbeddings(5);
    // querying with log[2]'s exact embedding should surface log[2] first
    const results = topKSimilar(embeddings[2], embeddings, logs, 1);
    expect(results[0].id).toBe(2);
  });

  it("returns an empty array when there are no logs", () => {
    const results = topKSimilar(makeEmbeddings(1)[0], [], [], 5);
    expect(results).toEqual([]);
  });
});
