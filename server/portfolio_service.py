from __future__ import annotations

from pathlib import Path
import re

from .context_loader import ContextLoader


class PortfolioSearchService:
    def __init__(self, pages_dir: Path) -> None:
        self.context = ContextLoader(pages_dir).load_adrian_context()

    async def search(self, query: str, limit: int = 4) -> list[dict[str, str]]:
        terms = {term.lower() for term in re.findall(r"[a-zA-Z][a-zA-Z0-9+.-]{2,}", query)}
        blocks = [block.strip() for block in self.context.split("\n\n") if block.strip()]

        scored: list[tuple[int, str]] = []
        for block in blocks:
            lower = block.lower()
            score = sum(1 for term in terms if term in lower)
            if score:
                scored.append((score, block))

        if not scored:
            scored = [(0, block) for block in blocks[:limit]]

        scored.sort(key=lambda item: item[0], reverse=True)
        return [
            {
                "title": self._title_for(block),
                "content": block[:1200],
            }
            for _, block in scored[:limit]
        ]

    @staticmethod
    def _title_for(block: str) -> str:
        first_line = block.splitlines()[0] if block.splitlines() else "Portfolio context"
        return first_line.replace(":", "").title()
