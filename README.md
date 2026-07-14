# ZTAM-RAG+

Zero-Trust Access Monitor with RAG-Based Explainability, Auto-Mitigation & Session Recovery.

## Phase 1: Backend Foundation & Authentication

Current focus:

- Express backend
- PostgreSQL integration
- User registration and login
- JWT authentication
- Protected routes
- Token versioning support

## Backend Setup

```bash
cd backend
npm install
npm run dev
```

The backend reads configuration from `backend/.env`.

For local development, create a PostgreSQL database named:

```bash
ztam_rag_plus
```

Example connection string:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ztam_rag_plus
```

## Health Check

```bash
curl http://127.0.0.1:5001/health
```

## Auth Routes

Register:

```bash
curl -X POST http://127.0.0.1:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@ztam.local","password":"Password123"}'
```

Login:

```bash
curl -X POST http://127.0.0.1:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@ztam.local","password":"Password123"}'
```

Protected profile route:

```bash
curl http://127.0.0.1:5001/api/protected/profile \
  -H "Authorization: Bearer YOUR_JWT_HERE"
```

## Token Versioning

JWT payloads include:

```json
{
  "userId": 1,
  "tokenVersion": 0
}
```

The auth middleware compares this token version against the current value in PostgreSQL. If the database value changes, older tokens are rejected. Later phases will use this for auto-mitigation and session recovery.

## Phase 2: Activity Logging

Authenticated protected requests flow through:

```text
authMiddleware -> activityLogger -> protected route
```

The logger writes after the response finishes, so it captures the final HTTP status code.

Table:

```sql
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method VARCHAR(10) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  status_code INTEGER NOT NULL,
  risk_score INTEGER NOT NULL DEFAULT 0,
  is_anomaly BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Inspect recent logs:

```bash
psql ztam_rag_plus -c "SELECT id, user_id, endpoint, method, ip_address, user_agent, status_code, risk_score, is_anomaly, created_at FROM activity_logs ORDER BY id DESC LIMIT 5;"
```

## Phase 3: Behavioral Risk Analysis

The baseline service reads historical `activity_logs` and computes:

- active hours
- common endpoints
- average requests per hour

The risk service uses deterministic rules:

| Signal | Score |
| --- | --- |
| Outside active hours | +40 |
| Rare endpoint | +35 |
| Request spike | +35 |

Any two signals together reach the HIGH threshold (70) — auto-mitigation isn't gated on the hour-based signal alone.

Risk levels:

| Score | Level |
| --- | --- |
| 0-29 | LOW |
| 30-69 | MEDIUM |
| 70+ | HIGH |

Run a direct risk check:

```bash
node -e "const riskService=require('./src/services/riskService'); riskService.calculateRisk({ userId: 1, endpoint: '/api/protected/profile' }).then(console.log);"
```

The protected request flow now stores risk data automatically:

```text
authMiddleware -> activityLogger -> riskService -> activity_logs insert
```

`activity_logs.risk_score` stores the numeric score. `activity_logs.is_anomaly` is set to `true` when the score reaches the HIGH risk threshold.
