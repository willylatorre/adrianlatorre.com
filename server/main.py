from collections.abc import AsyncIterator
from pathlib import Path
import json
import logging

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
from wave_counter import WaveCounter, WaveCounterError
from wave_counter.fastapi import create_router

from .api_football_service import ApiFootballService
from .config import Settings, get_settings
from .models import (
    ChatRequest,
    ImageGenerationRequest,
    ImageGenerationResponse,
    OrchestratorRequest,
)
from .openai_service import OpenAIService
from .orchestrator_service import OrchestratorService
from .portfolio_service import PortfolioSearchService
from .replicate_service import ReplicateService


logger = logging.getLogger(__name__)


def _legacy_coffee_total(database_path: str) -> int:
    """Read the pre-Wave Counter total for the one-time baseline migration."""
    import sqlite3

    try:
        with sqlite3.connect(database_path) as connection:
            row = connection.execute("SELECT counter FROM coffee LIMIT 1").fetchone()
    except sqlite3.Error:
        return 67
    return max(0, int(row[0])) if row else 67


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(title="Adrian Latorre API")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    try:
        counter = WaveCounter(
            database_path=settings.database_path,
            initial_counts={"coffee": _legacy_coffee_total(settings.database_path)},
        )
    except WaveCounterError:
        db_path = Path(settings.database_path)
        bak_path = db_path.with_suffix(".db.bak")
        if db_path.exists():
            db_path.rename(bak_path)
            logger.warning("Renamed incompatible database to %s, creating fresh DB", bak_path)
        counter = WaveCounter(
            database_path=settings.database_path,
            initial_counts={"coffee": _legacy_coffee_total(str(bak_path))},
        )
    app.include_router(create_router(counter), prefix="/api/waves")
    pages_dir = _resolve_pages_dir()
    openai_service = OpenAIService(settings.openai_api_key, pages_dir, settings.openai_model)
    replicate_service = ReplicateService(settings.replicate_api_key)
    api_football_service = ApiFootballService(settings.api_football_key)
    portfolio_service = PortfolioSearchService(pages_dir)
    orchestrator_service = OrchestratorService(
        settings.openai_api_key,
        api_football_service,
        portfolio_service,
    )

    def get_openai_service() -> OpenAIService:
        return openai_service

    def get_replicate_service() -> ReplicateService:
        return replicate_service

    def get_orchestrator_service() -> OrchestratorService:
        return orchestrator_service

    @app.get("/api/ping", response_class=PlainTextResponse)
    async def ping() -> str:
        return "pong"

    @app.post("/api/chat/message")
    async def send_message(
        chat_request: ChatRequest,
        service: OpenAIService = Depends(get_openai_service),
    ) -> StreamingResponse:
        if service.client is None:
            raise HTTPException(status_code=500, detail="openai client not configured")

        async def event_stream() -> AsyncIterator[str]:
            async for chunk in service.stream_chat(chat_request.messages, chat_request.prompt):
                yield f"data: {chunk}\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    @app.post("/api/chat/generate-image", response_model=ImageGenerationResponse)
    async def generate_image(
        image_request: ImageGenerationRequest,
        service: ReplicateService = Depends(get_replicate_service),
    ) -> ImageGenerationResponse:
        if not service.api_key:
            raise HTTPException(status_code=500, detail="replicate client not configured")

        try:
            image_url = await service.generate_image(image_request.prompt)
        except Exception as exc:
            logger.exception("Image generation failed")
            raise HTTPException(status_code=500, detail="Failed to generate image") from exc

        return ImageGenerationResponse(image_url=image_url)

    @app.post("/api/orchestrator/message")
    async def orchestrate_message(
        orchestrator_request: OrchestratorRequest,
        service: OrchestratorService = Depends(get_orchestrator_service),
    ) -> StreamingResponse:
        async def event_stream() -> AsyncIterator[str]:
            async for event in service.stream(orchestrator_request.prompt):
                event_type = event.get("type", "message")
                yield f"event: {event_type}\ndata: {json.dumps(event)}\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    _mount_static_files(app)
    return app


def _resolve_pages_dir() -> Path:
    candidates = [
        Path("/app/src/pages"),
        Path.cwd() / "src" / "pages",
        Path.cwd().parent / "src" / "pages",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]


def _resolve_dist_dir() -> Path:
    candidates = [
        Path("/app/dist"),
        Path.cwd() / "dist",
        Path.cwd().parent / "dist",
    ]
    for candidate in candidates:
        if (candidate / "index.html").exists():
            return candidate
    return candidates[0]


def _mount_static_files(app: FastAPI) -> None:
    dist_dir = _resolve_dist_dir()
    assets_dir = dist_dir / "assets"

    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False, response_model=None)
    async def serve_spa(request: Request, full_path: str) -> Response:
        if request.url.path.startswith("/api"):
            return PlainTextResponse("Not found", status_code=404)

        requested_file = dist_dir / full_path
        if requested_file.is_file():
            return FileResponse(requested_file)

        index_file = dist_dir / "index.html"
        if index_file.exists():
            return FileResponse(index_file)

        return PlainTextResponse("index.html not found", status_code=404)


app = create_app()


if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run("server.main:app", host="0.0.0.0", port=settings.server_port)
