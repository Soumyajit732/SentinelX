from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.services.explanation_service import ExplanationService


router = APIRouter()


# ── Request models ─────────────────────────────────────────────────────────────

class CurrentEvent(BaseModel):
    endpoint: str
    timestamp: str
    risk_score: int = Field(alias="riskScore", default=0)
    method: str = "GET"
    ip_address: str = Field(alias="ipAddress", default="unknown")
    status_code: int = Field(alias="statusCode", default=200)
    user_agent: str = Field(alias="userAgent", default="unknown")

    model_config = {"populate_by_name": True}


class ExplainRequest(BaseModel):
    user_id: int = Field(alias="userId")
    current_event: CurrentEvent = Field(alias="currentEvent")
    # Node.js sends the last N normal logs for this user from its DB
    historical_logs: list[dict[str, Any]] = Field(
        alias="historicalLogs", default_factory=list
    )

    model_config = {"populate_by_name": True}


# ── Response model ─────────────────────────────────────────────────────────────

class ExplainResponse(BaseModel):
    user_id: int
    explanation: str
    retrieved_logs: list[dict[str, Any]]
    current_event_text: str


# ── Dependency ─────────────────────────────────────────────────────────────────

def _get_explanation_service() -> ExplanationService:
    return ExplanationService()


# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.post(
    "/explain",
    response_model=ExplainResponse,
    summary="Generate a plain-English explanation for a suspicious security event",
)
async def explain_anomaly(
    body: ExplainRequest,
    service: ExplanationService = Depends(_get_explanation_service),
) -> ExplainResponse:
    current_event_dict: dict[str, Any] = {
        "user_id": body.user_id,
        "endpoint": body.current_event.endpoint,
        "timestamp": body.current_event.timestamp,
        "risk_score": body.current_event.risk_score,
        "method": body.current_event.method,
        "ip_address": body.current_event.ip_address,
        "status_code": body.current_event.status_code,
        "user_agent": body.current_event.user_agent,
    }

    try:
        result = await service.explain(
            current_event=current_event_dict,
            historical_logs=body.historical_logs,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Explanation generation failed: {exc}",
        ) from exc

    return ExplainResponse(
        user_id=body.user_id,
        explanation=result["explanation"],
        retrieved_logs=result["retrieved_logs"],
        current_event_text=result.get("current_event_text", ""),
    )
