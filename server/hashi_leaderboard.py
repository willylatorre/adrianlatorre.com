from datetime import UTC, datetime
import sqlite3

from .models import HashiCategory, HashiScore, HashiScoreCreate


class HashiLeaderboard:
    def __init__(self, database_path: str) -> None:
        self.database_path = database_path
        with sqlite3.connect(self.database_path) as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS hashi_scores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category TEXT NOT NULL CHECK(category IN ('intro', 'daily', 'weekly', 'monthly')),
                    puzzle_fingerprint TEXT NOT NULL,
                    nickname TEXT NOT NULL,
                    duration_ms INTEGER NOT NULL CHECK(duration_ms > 0),
                    hints_used INTEGER CHECK(hints_used BETWEEN 0 AND 3),
                    created_at INTEGER NOT NULL
                )
                """
            )
            columns = {
                row[1]
                for row in connection.execute("PRAGMA table_info(hashi_scores)").fetchall()
            }
            if "hints_used" not in columns:
                connection.execute(
                    "ALTER TABLE hashi_scores ADD COLUMN hints_used INTEGER CHECK(hints_used BETWEEN 0 AND 3)"
                )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS hashi_scores_category_time
                ON hashi_scores(category, duration_ms, created_at)
                """
            )

    def add(self, score: HashiScoreCreate) -> HashiScore:
        nickname = " ".join(score.nickname.split())
        created_at = int(datetime.now(UTC).timestamp() * 1_000)

        with sqlite3.connect(self.database_path) as connection:
            connection.execute(
                """
                INSERT INTO hashi_scores(
                    category, puzzle_fingerprint, nickname, duration_ms, hints_used, created_at
                )
                VALUES(?, ?, ?, ?, ?, ?)
                """,
                (
                    score.category,
                    score.puzzle_fingerprint,
                    nickname,
                    score.duration_ms,
                    score.hints_used,
                    created_at,
                ),
            )

        return self._score(nickname, score.duration_ms, score.hints_used, created_at)

    def top(self, category: HashiCategory, limit: int) -> list[HashiScore]:
        with sqlite3.connect(self.database_path) as connection:
            rows = connection.execute(
                """
                SELECT nickname, duration_ms, hints_used, created_at
                FROM hashi_scores
                WHERE category = ?
                ORDER BY duration_ms ASC, hints_used IS NULL ASC, hints_used ASC, created_at ASC
                LIMIT ?
                """,
                (category, limit),
            ).fetchall()

        return [
            self._score(nickname, duration_ms, hints_used, created_at)
            for nickname, duration_ms, hints_used, created_at in rows
        ]

    @staticmethod
    def _score(
        nickname: str, duration_ms: int, hints_used: int | None, created_at: int
    ) -> HashiScore:
        return HashiScore(
            nickname=nickname,
            duration_ms=duration_ms,
            hints_used=hints_used,
            created_at=datetime.fromtimestamp(created_at / 1_000, UTC),
        )
