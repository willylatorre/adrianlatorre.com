from datetime import UTC, datetime
from pathlib import Path

from fastapi.testclient import TestClient

from server.config import Settings
from server.main import create_app
from server.orchestrator_service import AgentId, MAX_TOOL_CALLS, ROUTER_MODEL, RouteDecision


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
    assert response.json()["detail"] == "replicate client not configured"


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


def test_orchestrator_sse_headers_with_stubbed_service(tmp_path: Path) -> None:
    app = create_app(
        Settings(
            database_path=str(tmp_path / "test.db"),
            environment="test",
            openai_api_key="test-key",
        )
    )
    route = next(
        route for route in app.routes if getattr(route, "path", "") == "/api/orchestrator/message"
    )
    service_dependency = route.dependant.dependencies[0].call

    class StubService:
        async def stream(self, prompt):
            yield {
                "type": "route_completed",
                "timestamp": datetime.now(UTC).isoformat(),
                "decision": {
                    "selected_agent": "joke_agent",
                    "confidence": 0.91,
                    "reason": "The prompt asks for a joke.",
                    "normalized_query": prompt,
                },
            }
            yield {
                "type": "agent_token",
                "timestamp": datetime.now(UTC).isoformat(),
                "text": "hello",
            }

    app.dependency_overrides[service_dependency] = lambda: StubService()
    client = TestClient(app)

    response = client.post("/api/orchestrator/message", json={"prompt": "Tell me a joke"})

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert "event: route_completed\n" in response.text
    assert '"selected_agent": "joke_agent"' in response.text
    assert "event: agent_token\n" in response.text


def test_orchestrator_request_requires_prompt(tmp_path: Path) -> None:
    client = build_client(tmp_path)

    response = client.post("/api/orchestrator/message", json={})

    assert response.status_code == 422


def test_route_decision_rejects_unknown_agent() -> None:
    result = RouteDecision.model_validate(
        {
            "selected_agent": "joke_agent",
            "confidence": 0.7,
            "reason": "Joke requested.",
            "normalized_query": "Tell me a joke",
        }
    )

    assert result.selected_agent == AgentId.joke

    try:
        RouteDecision.model_validate(
            {
                "selected_agent": "weather_agent",
                "confidence": 0.7,
                "reason": "Weather requested.",
                "normalized_query": "Will it rain?",
            }
        )
    except Exception as exc:
        assert "weather_agent" in str(exc)
    else:
        raise AssertionError("unknown agent should fail validation")


def test_missing_api_football_key_streams_clear_error(tmp_path: Path) -> None:
    app = create_app(
        Settings(
            database_path=str(tmp_path / "test.db"),
            environment="test",
            openai_api_key="test-key",
            api_football_key="",
        )
    )
    route = next(
        route for route in app.routes if getattr(route, "path", "") == "/api/orchestrator/message"
    )
    service_dependency = route.dependant.dependencies[0].call
    service = service_dependency()

    async def route_to_soccer(prompt):
        return RouteDecision(
            selected_agent=AgentId.soccer,
            confidence=0.9,
            reason="The prompt asks for soccer data.",
            normalized_query=prompt,
        )

    service._route = route_to_soccer
    app.dependency_overrides[service_dependency] = lambda: service
    client = TestClient(app)

    response = client.post("/api/orchestrator/message", json={"prompt": "Who does Arsenal play next?"})

    assert response.status_code == 200
    assert "API_FOOTBALL_KEY is not configured" in response.text


def test_tool_call_cap_is_three() -> None:
    assert MAX_TOOL_CALLS == 3


def test_orchestrator_router_uses_nano_model() -> None:
    assert ROUTER_MODEL == "gpt-5.4-nano"
