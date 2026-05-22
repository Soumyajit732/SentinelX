from datetime import datetime, timezone
from typing import Any


UNKNOWN_VALUE = "unknown"


def _first_present(log: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = log.get(key)
        if value is not None:
            return value

    return None


def _format_timestamp(value: Any) -> str:
    if value is None:
        return "an unknown time"

    if isinstance(value, datetime):
        timestamp = value
    elif isinstance(value, str):
        normalized = value.replace("Z", "+00:00")
        try:
            timestamp = datetime.fromisoformat(normalized)
        except ValueError:
            return value
    else:
        return str(value)

    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)

    return timestamp.strftime("%I:%M %p on %Y-%m-%d").lstrip("0")


def _format_bool(value: Any) -> str:
    return "yes" if bool(value) else "no"


def format_activity_log(log: dict[str, Any]) -> str:
    user_id = _first_present(log, "user_id", "userId") or UNKNOWN_VALUE
    endpoint = _first_present(log, "endpoint", "path") or UNKNOWN_VALUE
    method = (_first_present(log, "method", "httpMethod") or UNKNOWN_VALUE)
    ip_address = _first_present(log, "ip_address", "ipAddress") or UNKNOWN_VALUE
    user_agent = _first_present(log, "user_agent", "userAgent") or UNKNOWN_VALUE
    status_code = _first_present(log, "status_code", "statusCode") or UNKNOWN_VALUE
    risk_score = _first_present(log, "risk_score", "riskScore")
    is_anomaly = _first_present(log, "is_anomaly", "isAnomaly")
    created_at = _first_present(log, "created_at", "createdAt", "timestamp")

    text = (
        f"User {user_id} accessed {endpoint} using {str(method).upper()} "
        f"at {_format_timestamp(created_at)} from IP {ip_address}. "
        f"The request returned status {status_code} and used user agent {user_agent}."
    )

    if risk_score is not None:
        text += f" Deterministic risk score was {risk_score}."

    if is_anomaly is not None:
        text += f" Marked as anomaly: {_format_bool(is_anomaly)}."

    return text


def format_activity_logs(logs: list[dict[str, Any]]) -> list[str]:
    return [format_activity_log(log) for log in logs]
