from fastapi import FastAPI

from app.routes.explain import router as explain_router
from app.routes.health import router as health_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="SentinelX Analysis Service",
        description="RAG explainability service for SentinelX security events.",
        version="0.1.0",
    )

    app.include_router(health_router, tags=["health"])
    app.include_router(explain_router, tags=["explain"])

    return app


app = create_app()
