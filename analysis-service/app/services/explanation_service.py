from typing import Any

from openai import AsyncOpenAI

from app.config import get_settings
from app.services.embedding_service import get_embedding_service
from app.services.faiss_store import FAISSStore
from app.utils.log_formatter import format_activity_log, format_activity_logs


_SYSTEM_PROMPT = """\
You are a cybersecurity analyst assistant embedded in SentinelX, a Zero-Trust \
Identity Intelligence Platform. Your sole role is to explain why a specific \
security event looks suspicious by comparing it against the user's historical \
normal behaviour.

Rules:
- Be concise (2–4 sentences maximum).
- Focus on concrete deviations: unusual time, unfamiliar endpoint, new IP, \
abnormal frequency.
- Do NOT make security decisions, assign blame, or recommend actions.
- Do NOT declare the user guilty or innocent.
- Write in plain English for a security operations dashboard.\
"""


def _build_prompt(current_text: str, history_texts: list[str]) -> str:
    history_block = "\n".join(f"  • {t}" for t in history_texts)
    return (
        f"Normal historical behaviour for this user:\n{history_block}\n\n"
        f"Current suspicious event:\n  {current_text}\n\n"
        "Explain why this event deviates from the user's normal behaviour."
    )


class ExplanationService:
    """
    Stateless RAG pipeline:
      1. Embed the suspicious event.
      2. Build a per-request FAISS index from historical (normal) logs.
      3. Retrieve the top-k most similar historical logs.
      4. Ask OpenAI to explain the deviation in plain English.
    """

    def __init__(self) -> None:
        self._settings = get_settings()
        self._embedding_service = get_embedding_service()
        self._openai: AsyncOpenAI | None = None

    @property
    def _client(self) -> AsyncOpenAI:
        if self._openai is None:
            self._openai = AsyncOpenAI(api_key=self._settings.openai_api_key)
        return self._openai

    async def explain(
        self,
        current_event: dict[str, Any],
        historical_logs: list[dict[str, Any]],
    ) -> dict[str, Any]:
        if not historical_logs:
            return {
                "explanation": (
                    "No historical behaviour data is available for this user. "
                    "Unable to perform behavioural comparison."
                ),
                "retrieved_logs": [],
                "current_event_text": format_activity_log(current_event),
            }

        # --- Embed historical logs and build a fresh FAISS index ---
        historical_texts = format_activity_logs(historical_logs)
        historical_embeddings = self._embedding_service.embed_texts(historical_texts)

        dimension = historical_embeddings.shape[1]
        store = FAISSStore(dimension)
        store.add_logs(historical_logs, historical_embeddings)

        # --- Embed current event and retrieve nearest historical logs ---
        current_text = format_activity_log(current_event)
        current_embedding = self._embedding_service.embed_text(current_text)
        retrieved = store.search(current_embedding, k=self._settings.faiss_top_k)
        retrieved_texts = format_activity_logs(retrieved)

        # --- Build prompt and call OpenAI ---
        prompt = _build_prompt(current_text, retrieved_texts)

        response = await self._client.chat.completions.create(
            model=self._settings.openai_model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=220,
        )

        explanation = response.choices[0].message.content.strip()

        return {
            "explanation": explanation,
            "retrieved_logs": retrieved,
            "current_event_text": current_text,
        }
