from __future__ import annotations

from collections.abc import AsyncIterator, Awaitable, Callable
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import uuid4
import json
import re

from openai import AsyncOpenAI
from pydantic import BaseModel, Field, ValidationError

from .api_football_service import ApiFootballService
from .portfolio_service import PortfolioSearchService


ROUTER_MODEL = "gpt-5.4-nano"
AGENT_MODEL = "gpt-5-mini"
MAX_TOOL_CALLS = 3


class AgentId(StrEnum):
    joke = "joke_agent"
    soccer = "soccer_agent"
    portfolio = "portfolio_agent"
    none = "none"


class RouteDecision(BaseModel):
    selected_agent: AgentId
    confidence: float = Field(ge=0, le=1)
    reason: str = Field(min_length=1)
    normalized_query: str = Field(min_length=1)


class ToolPlanItem(BaseModel):
    name: str
    args: dict[str, Any] = Field(default_factory=dict)
    reason: str = ""


class ToolPlan(BaseModel):
    tool_calls: list[ToolPlanItem] = Field(default_factory=list)


class OrchestratorService:
    def __init__(
        self,
        openai_api_key: str,
        soccer_service: ApiFootballService,
        portfolio_service: PortfolioSearchService,
    ) -> None:
        self.client = AsyncOpenAI(api_key=openai_api_key) if openai_api_key else None
        self.soccer_service = soccer_service
        self.portfolio_service = portfolio_service

    async def stream(self, prompt: str) -> AsyncIterator[dict[str, Any]]:
        if self.client is None:
            yield self._event("error", {"message": "openai client not configured"})
            yield self._event("done", {})
            return

        try:
            yield self._event("route_started", {"message": "Routing prompt to a specialist agent."})
            decision = await self._route(prompt)
            yield self._event("route_completed", {"decision": decision.model_dump(mode="json")})

            if decision.selected_agent == AgentId.none:
                yield self._event("agent_selected", {"agent": AgentId.none})
                text = (
                    "I only route between Joke, Soccer, and Portfolio agents in this demo. "
                    "Try asking for a joke, a soccer question, or something about Adrian's projects."
                )
                yield self._event("agent_token", {"text": text})
                yield self._event("done", {})
                return

            yield self._event("agent_selected", {"agent": decision.selected_agent})

            if decision.selected_agent == AgentId.joke:
                async for event in self._stream_joke_agent(decision.normalized_query):
                    yield event
            elif decision.selected_agent == AgentId.portfolio:
                async for event in self._stream_portfolio_agent(decision.normalized_query):
                    yield event
            elif decision.selected_agent == AgentId.soccer:
                async for event in self._stream_soccer_agent(decision.normalized_query):
                    yield event
        except Exception as exc:
            yield self._event("error", {"message": str(exc)})

        yield self._event("done", {})

    async def _route(self, prompt: str) -> RouteDecision:
        system = """You route a user's prompt to exactly one specialist.

Agents:
- joke_agent: jokes, puns, comedic one-liners, playful writing.
- soccer_agent: factual football/soccer teams, fixtures, results, standings, scorers, players, leagues.
- portfolio_agent: Adrian Latorre, this website, software projects, career, personal work.
- none: everything outside those scopes.

Tie breaks:
- If the user asks for humor or joke format, choose joke_agent.
- If the user asks for fresh soccer facts, choose soccer_agent.
- If the user asks about Adrian or this site, choose portfolio_agent.

Return only JSON with selected_agent, confidence, reason, normalized_query."""
        content = await self._complete_json(system, prompt, ROUTER_MODEL)
        try:
            return RouteDecision.model_validate(content)
        except ValidationError:
            return RouteDecision(
                selected_agent=AgentId.none,
                confidence=0,
                reason="The router did not return a valid agent decision.",
                normalized_query=prompt,
            )

    async def _stream_joke_agent(self, query: str) -> AsyncIterator[dict[str, Any]]:
        messages = [
            {
                "role": "system",
                "content": "You are Joke Agent. Answer with a concise, original joke or playful response.",
            },
            {"role": "user", "content": query},
        ]
        async for text in self._stream_text(messages):
            yield self._event("agent_token", {"text": text})

    async def _stream_portfolio_agent(self, query: str) -> AsyncIterator[dict[str, Any]]:
        call_id = str(uuid4())
        yield self._event(
            "tool_call_started",
            {
                "call": {
                    "id": call_id,
                    "name": "portfolio_search",
                    "args": {"query": query},
                    "reason": "Find local context about Adrian and this website.",
                }
            },
        )
        results = await self.portfolio_service.search(query)
        yield self._event(
            "tool_call_completed",
            {
                "call_id": call_id,
                "summary": f"Found {len(results)} local context blocks.",
                "raw": {"results": results},
            },
        )

        messages = [
            {
                "role": "system",
                "content": (
                    "You are Portfolio Agent. Answer using only the provided local portfolio context. "
                    "Be concise and point to concrete projects or pages when relevant."
                ),
            },
            {"role": "user", "content": f"Question: {query}\n\nContext:\n{json.dumps(results)}"},
        ]
        async for text in self._stream_text(messages):
            yield self._event("agent_token", {"text": text})

    async def _stream_soccer_agent(self, query: str) -> AsyncIterator[dict[str, Any]]:
        if not self.soccer_service.is_configured:
            yield self._event("error", {"message": "API_FOOTBALL_KEY is not configured"})
            return

        plan = await self._plan_soccer_tools(query)
        tool_results: list[dict[str, Any]] = []

        for item in plan.tool_calls[:MAX_TOOL_CALLS]:
            call_id = str(uuid4())
            yield self._event(
                "tool_call_started",
                {
                    "call": {
                        "id": call_id,
                        "name": item.name,
                        "args": item.args,
                        "reason": item.reason,
                    }
                },
            )
            try:
                result = await self._execute_soccer_tool(item)
                tool_results.append({"tool": item.model_dump(), "result": result})
                yield self._event(
                    "tool_call_completed",
                    {
                        "call_id": call_id,
                        "summary": self._summarize_tool_result(item.name, result),
                        "raw": result,
                    },
                )
            except Exception as exc:
                yield self._event(
                    "tool_call_completed",
                    {
                        "call_id": call_id,
                        "summary": f"{item.name} failed: {exc}",
                        "raw": {"error": str(exc)},
                    },
                )
                break

        messages = [
            {
                "role": "system",
                "content": (
                    "You are Soccer Agent. Answer from the tool results. If the data is missing, "
                    "say what you could not verify and why. Do not offer to browse the web or use "
                    "tools that are not present in the tool results. Keep the answer concise."
                ),
            },
            {
                "role": "user",
                "content": f"Question: {query}\n\nTool results:\n{json.dumps(tool_results)[:12000]}",
            },
        ]
        async for text in self._stream_text(messages):
            yield self._event("agent_token", {"text": text})

    async def _plan_soccer_tools(self, query: str) -> ToolPlan:
        system = f"""Choose up to {MAX_TOOL_CALLS} API-Football tools for this soccer question.

Allowed tools:
- search_team(query: string)
- get_team_next_fixtures(team_id: integer or team_query: string, next_count: integer)
- get_team_recent_fixtures(team_id: integer or team_query: string, last_count: integer)
- search_league(query: string)
- get_league_standings(league_id: integer or league_query: string, season: integer)
- get_top_scorers(league_id: integer or league_query: string, season: integer)

Prefer team_query or league_query when you do not already know the API-Football id.
Use season 2024 unless the user asks for another season.
Return only JSON: {{"tool_calls":[{{"name":"search_team","args":{{"query":"Arsenal"}},"reason":"..."}}]}}."""
        content = await self._complete_json(system, query, AGENT_MODEL)
        try:
            return ToolPlan.model_validate(content)
        except ValidationError:
            return ToolPlan(tool_calls=[ToolPlanItem(name="search_team", args={"query": query})])

    async def _execute_soccer_tool(self, item: ToolPlanItem) -> dict[str, Any]:
        args = dict(item.args)
        if item.name in {"get_team_next_fixtures", "get_team_recent_fixtures"}:
            args = await self._with_team_id(args)
        elif item.name in {"get_league_standings", "get_top_scorers"}:
            args = await self._with_league_id(args)

        tools: dict[str, Callable[..., Awaitable[dict[str, Any]]]] = {
            "search_team": self.soccer_service.search_team,
            "get_team_next_fixtures": self.soccer_service.get_team_next_fixtures,
            "get_team_recent_fixtures": self.soccer_service.get_team_recent_fixtures,
            "search_league": self.soccer_service.search_league,
            "get_league_standings": self.soccer_service.get_league_standings,
            "get_top_scorers": self.soccer_service.get_top_scorers,
        }
        if item.name not in tools:
            raise RuntimeError(f"Unknown soccer tool: {item.name}")
        return await tools[item.name](**args)

    async def _with_team_id(self, args: dict[str, Any]) -> dict[str, Any]:
        if "team_id" in args:
            return args
        query = args.pop("team_query", None) or args.pop("query", None)
        if not query:
            return args
        search_result = await self.soccer_service.search_team(str(query))
        teams = search_result.get("teams", [])
        if not teams:
            raise RuntimeError(f"No team found for {query}")
        team_id = teams[0]["team"]["id"]
        return {"team_id": team_id, **args}

    async def _with_league_id(self, args: dict[str, Any]) -> dict[str, Any]:
        if "league_id" in args:
            return args
        query = args.pop("league_query", None) or args.pop("query", None)
        if not query:
            return args
        search_result = await self.soccer_service.search_league(str(query))
        leagues = search_result.get("leagues", [])
        if not leagues:
            raise RuntimeError(f"No league found for {query}")
        league_id = leagues[0]["league"]["id"]
        return {"league_id": league_id, **args}

    async def _complete_json(self, system: str, prompt: str, model: str) -> dict[str, Any]:
        assert self.client is not None
        response = await self.client.responses.create(
            model=model,
            input=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
        )
        text = getattr(response, "output_text", "") or str(response)
        return self._parse_json_object(text)

    async def _stream_text(self, messages: list[dict[str, str]]) -> AsyncIterator[str]:
        assert self.client is not None
        stream = await self.client.responses.create(model=AGENT_MODEL, input=messages, stream=True)
        async for event in stream:
            if event.type == "response.output_text.delta" and event.delta:
                yield event.delta
            elif event.type == "error":
                raise RuntimeError(str(event))

    @staticmethod
    def _parse_json_object(text: str) -> dict[str, Any]:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r"\{[\s\S]*\}", text)
            if match:
                return json.loads(match.group(0))
            raise

    @staticmethod
    def _summarize_tool_result(name: str, result: dict[str, Any]) -> str:
        response = result.get("response")
        if isinstance(response, list):
            return f"{name} returned {len(response)} records."
        if "teams" in result:
            return f"{name} returned {len(result['teams'])} teams."
        if "leagues" in result:
            return f"{name} returned {len(result['leagues'])} leagues."
        return f"{name} completed."

    @staticmethod
    def _event(event_type: str, payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "type": event_type,
            "timestamp": datetime.now(UTC).isoformat(),
            **payload,
        }
