from datetime import UTC, datetime
from pathlib import Path

from fastapi.testclient import TestClient

from server.config import Settings
from server.main import create_app


def build_client(tmp_path: Path) -> TestClient:
    app = create_app(
        Settings(
            database_path=str(tmp_path / "test.db"),
            environment="test",
            openai_api_key="",
        )
    )
    return TestClient(app)


def test_get_coffee_returns_seed_counter(tmp_path: Path) -> None:
    client = build_client(tmp_path)

    response = client.get("/api/coffee")

    assert response.status_code == 200
    body = response.json()
    assert body["data"]["counter"] == 67
    assert body["data"]["id"] == 1
    assert "last_update" in body["data"]


def test_increment_coffee_updates_counter(tmp_path: Path) -> None:
    client = build_client(tmp_path)

    response = client.post("/api/coffee/increment")

    assert response.status_code == 200
    body = response.json()
    assert body["data"]["counter"] == 68
    assert body["message"] == "Coffee counter incremented"


def test_invalid_chat_request_returns_422(tmp_path: Path) -> None:
    client = build_client(tmp_path)

    response = client.post("/api/chat/message", json={"messages": []})

    assert response.status_code == 422


def test_missing_openai_key_returns_error(tmp_path: Path) -> None:
    client = build_client(tmp_path)

    response = client.post(
        "/api/chat/generate-image",
        json={"prompt": "a quiet desk with a coffee mug"},
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "openai client not configured"


def test_chat_sse_headers_with_stubbed_service(tmp_path: Path) -> None:
    app = create_app(
        Settings(
            database_path=str(tmp_path / "test.db"),
            environment="test",
            openai_api_key="test-key",
        )
    )
    route = next(route for route in app.routes if getattr(route, "path", "") == "/api/chat/message")
    service_dependency = route.dependant.dependencies[0].call

    class StubService:
        client = object()

        async def stream_chat(self, messages, prompt):
            yield "hello"
            yield " world"

    app.dependency_overrides[service_dependency] = lambda: StubService()
    client = TestClient(app)

    response = client.post(
        "/api/chat/message",
        json={
            "messages": [
                {
                    "id": "1",
                    "role": "user",
                    "content": "Hi",
                    "timestamp": datetime.now(UTC).isoformat(),
                }
            ],
            "prompt": "Tell me something",
        },
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert "data: hello\n\n" in response.text
    assert "data:  world\n\n" in response.text
