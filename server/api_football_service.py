from __future__ import annotations

import asyncio
from datetime import date, timedelta
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import json


class ApiFootballService:
    base_url = "https://v3.football.api-sports.io"

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def search_team(self, query: str) -> dict[str, Any]:
        data = await self._get("/teams", {"search": query})
        teams = data.get("response", [])[:5]
        return {"teams": teams}

    async def get_team_next_fixtures(self, team_id: int, next_count: int = 3) -> dict[str, Any]:
        today = date.today()
        data = await self._get(
            "/fixtures",
            {
                "team": team_id,
                "season": self._default_season(today),
                "from": today.isoformat(),
                "to": (today + timedelta(days=90)).isoformat(),
            },
        )
        data["response"] = data.get("response", [])[:next_count]
        data["results"] = len(data["response"])
        return data

    async def get_team_recent_fixtures(self, team_id: int, last_count: int = 3) -> dict[str, Any]:
        today = date.today()
        data = await self._get(
            "/fixtures",
            {
                "team": team_id,
                "season": self._default_season(today),
                "from": (today - timedelta(days=90)).isoformat(),
                "to": today.isoformat(),
            },
        )
        data["response"] = data.get("response", [])[-last_count:]
        data["results"] = len(data["response"])
        return data

    @staticmethod
    def _default_season(day: date) -> int:
        return 2024

    async def search_league(self, query: str) -> dict[str, Any]:
        data = await self._get("/leagues", {"search": query})
        return {"leagues": data.get("response", [])[:5]}

    async def get_league_standings(self, league_id: int, season: int) -> dict[str, Any]:
        return await self._get("/standings", {"league": league_id, "season": season})

    async def get_top_scorers(self, league_id: int, season: int) -> dict[str, Any]:
        return await self._get("/players/topscorers", {"league": league_id, "season": season})

    async def _get(self, path: str, params: dict[str, object]) -> dict[str, Any]:
        if not self.api_key:
            raise RuntimeError("API_FOOTBALL_KEY is not configured")

        query = urlencode({key: value for key, value in params.items() if value is not None})
        url = f"{self.base_url}{path}?{query}"

        def fetch() -> dict[str, Any]:
            request = Request(url, headers={"x-apisports-key": self.api_key})
            with urlopen(request, timeout=12) as response:
                payload = response.read().decode("utf-8")
            return json.loads(payload)

        return await asyncio.to_thread(fetch)
