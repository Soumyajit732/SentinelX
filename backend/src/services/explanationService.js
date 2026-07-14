const OpenAI = require("openai");
const env = require("../config/env");
const { formatActivityLog, formatActivityLogs } = require("../utils/logFormatter");

const SYSTEM_PROMPT = `You are a cybersecurity analyst assistant embedded in SentinelX, a Zero-Trust \
Identity Intelligence Platform. Your sole role is to explain why a specific \
security event looks suspicious by comparing it against the user's historical \
normal behaviour.

Rules:
- Be concise (2–4 sentences maximum).
- Focus on concrete deviations: unusual time, unfamiliar endpoint, new IP, \
abnormal frequency.
- Do NOT make security decisions, assign blame, or recommend actions.
- Do NOT declare the user guilty or innocent.
- Write in plain English for a security operations dashboard.`;

let client;
function getClient() {
  if (!client) {
    client = new OpenAI({ apiKey: env.openaiApiKey });
  }
  return client;
}

function buildPrompt(currentText, historyTexts) {
  const historyBlock = historyTexts.map((t) => `  • ${t}`).join("\n");
  return (
    `Normal historical behaviour for this user:\n${historyBlock}\n\n` +
    `Current suspicious event:\n  ${currentText}\n\n` +
    "Explain why this event deviates from the user's normal behaviour."
  );
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Ranks historicalLogs by embedding similarity to the current event and
 * returns the top-k most similar (descending). Equivalent to a per-request
 * FAISS IndexFlatIP search over L2-normalised embeddings.
 */
function topKSimilar(currentEmbedding, historicalEmbeddings, historicalLogs, k) {
  const scored = historicalLogs.map((log, i) => ({
    log,
    score: cosineSimilarity(currentEmbedding, historicalEmbeddings[i]),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((s) => s.log);
}

async function embedTexts(texts) {
  if (texts.length === 0) return [];
  const response = await getClient().embeddings.create({
    model: env.embeddingModel,
    input: texts,
  });
  return response.data.map((d) => d.embedding);
}

/**
 * Stateless RAG pipeline:
 *   1. Embed the suspicious event and the user's historical (normal) logs.
 *   2. Retrieve the top-k most similar historical logs by cosine similarity.
 *   3. Ask OpenAI to explain the deviation in plain English.
 *
 * @param {object} params
 * @param {number}   params.userId
 * @param {object}   params.currentEvent  - the anomalous activity_log row
 * @param {object[]} params.historicalLogs - recent normal logs for this user
 * @returns {Promise<string>} human-readable explanation
 */
async function explain({ currentEvent, historicalLogs }) {
  if (!historicalLogs || historicalLogs.length === 0) {
    return (
      "No historical behaviour data is available for this user. " +
      "Unable to perform behavioural comparison."
    );
  }

  const currentText = formatActivityLog(currentEvent);
  const historyTexts = formatActivityLogs(historicalLogs);

  const [currentEmbedding, historicalEmbeddings] = await Promise.all([
    embedTexts([currentText]).then((e) => e[0]),
    embedTexts(historyTexts),
  ]);

  const retrieved = topKSimilar(
    currentEmbedding,
    historicalEmbeddings,
    historicalLogs,
    env.ragTopK
  );
  const retrievedTexts = formatActivityLogs(retrieved);

  const prompt = buildPrompt(currentText, retrievedTexts);

  const response = await getClient().chat.completions.create({
    model: env.openaiModel,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 220,
  });

  return response.choices[0].message.content.trim();
}

module.exports = { explain, cosineSimilarity, topKSimilar };
