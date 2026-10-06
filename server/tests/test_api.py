from datetime import UTC, datetime
from pathlib import Path
import sqlite3

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


def test_hashi_leaderboard_orders_times_and_isolates_categories(tmp_path: Path) -> None:
    client = build_client(tmp_path)

    for nickname, duration in [("Ada", 90_000), ("Lin", 45_000), ("Sam", 61_000)]:
        response = client.post(
            "/api/hashi/scores",
            json={
                "category": "daily",
                "puzzleFingerprint": "a" * 16,
                "nickname": nickname,
                "durationMs": duration,
            },
        )
        assert response.status_code == 201

    response = client.post(
        "/api/hashi/scores",
        json={
            "category": "weekly",
            "puzzleFingerprint": "b" * 16,
            "nickname": "Bea",
            "durationMs": 1_000,
        },
    )
    assert response.status_code == 201

    body = client.get("/api/hashi/leaderboard?category=daily&limit=2").json()

    assert body["category"] == "daily"
    assert [entry["nickname"] for entry in body["entries"]] == ["Lin", "Sam"]
    assert [entry["durationMs"] for entry in body["entries"]] == [45_000, 61_000]


def test_hashi_score_rejects_bad_category_nickname_duration_and_fingerprint(tmp_path: Path) -> None:
    client = build_client(tmp_path)

    response = client.post(
        "/api/hashi/scores",
        json={
            "category": "yearly",
            "puzzleFingerprint": "x",
            "nickname": "",
            "durationMs": -1,
        },
    )

    assert response.status_code == 422


def test_hashi_score_rejects_whitespace_only_nickname(tmp_path: Path) -> None:
    client = build_client(tmp_path)

    response = client.post(
        "/api/hashi/scores",
        json={
            "category": "daily",
            "puzzleFingerprint": "a" * 16,
            "nickname": "   ",
            "durationMs": 10_000,
        },
    )

    assert response.status_code == 422


def test_hashi_leaderboard_uses_creation_time_to_break_equal_times(tmp_path: Path) -> None:
    client = build_client(tmp_path)
    scores = [
        ("Slow", 61_000),
        ("First fast", 60_000),
        ("Second fast", 60_000),
    ]

    for nickname, duration_ms in scores:
        response = client.post(
            "/api/hashi/scores",
            json={
                "category": "daily",
                "puzzleFingerprint": "a" * 16,
                "nickname": nickname,
                "durationMs": duration_ms,
            },
        )
        assert response.status_code == 201

    entries = client.get("/api/hashi/leaderboard?category=daily&limit=5").json()["entries"]
    assert [entry["nickname"] for entry in entries] == [
        "First fast",
        "Second fast",
        "Slow",
    ]


def test_hashi_leaderboard_drops_legacy_hint_columns(tmp_path: Path) -> None:
    database = tmp_path / "test.db"
    with sqlite3.connect(database) as connection:
        connection.execute(
            """CREATE TABLE hashi_scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL,
                puzzle_fingerprint TEXT NOT NULL,
                nickname TEXT NOT NULL,
                duration_ms INTEGER NOT NULL,
                hints_used INTEGER,
                created_at INTEGER NOT NULL
            )"""
        )
        connection.execute(
            "INSERT INTO hashi_scores(category, puzzle_fingerprint, nickname, duration_ms, hints_used, created_at) VALUES(?, ?, ?, ?, ?, ?)",
            ("daily", "a" * 16, "Legacy", 50_000, 3, 1_000),
        )

    client = build_client(tmp_path)
    entry = client.get("/api/hashi/leaderboard?category=daily&limit=5").json()["entries"][0]
    assert entry["nickname"] == "Legacy"
    with sqlite3.connect(database) as connection:
        columns = {row[1] for row in connection.execute("PRAGMA table_info(hashi_scores)")}
    assert "hints_used" not in columns


def test_wave_counter_preserves_seed_total_and_records_events(tmp_path: Path) -> None:
    client = build_client(tmp_path)

    response = client.get("/api/waves/counters/coffee")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 67

    response = client.post(
        "/api/waves/counters/coffee/events",
        json={"eventId": "0198f2f7-6d42-7d94-b1a6-e4305543f132"},
    )

    assert response.status_code == 201
    assert response.json()["total"] == 68
    assert client.get("/api/coffee").status_code == 404


def test_wave_counter_imports_the_legacy_total_without_fabricating_events(tmp_path: Path) -> None:
    database = tmp_path / "test.db"
    with sqlite3.connect(database) as connection:
        connection.execute(
            "CREATE TABLE coffee (id INTEGER PRIMARY KEY, counter INTEGER NOT NULL)"
        )
        connection.execute("INSERT INTO coffee (id, counter) VALUES (1, 91)")

    client = build_client(tmp_path)

    assert client.get("/api/waves/counters/coffee").json()["total"] == 91
    analytics = client.get("/api/waves/counters/coffee/analytics?window=7d").json()
    assert analytics["total"] == 0


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
