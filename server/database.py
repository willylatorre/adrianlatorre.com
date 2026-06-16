from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
import sqlite3

from .models import Coffee


class CoffeeRepository:
    def __init__(self, db_path: str) -> None:
        self.db_path = db_path
        self._memory_connection: sqlite3.Connection | None = None
        self.init_db()

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        if self.db_path == ":memory:":
            if self._memory_connection is None:
                self._memory_connection = sqlite3.connect(
                    self.db_path, detect_types=sqlite3.PARSE_DECLTYPES
                )
                self._memory_connection.row_factory = sqlite3.Row

            yield self._memory_connection
            self._memory_connection.commit()
            return

        connection = sqlite3.connect(self.db_path, detect_types=sqlite3.PARSE_DECLTYPES)
        connection.row_factory = sqlite3.Row
        try:
            yield connection
            connection.commit()
        finally:
            connection.close()

    def init_db(self) -> None:
        if self.db_path != ":memory:":
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)

        with self.connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS coffee (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    counter INTEGER NOT NULL DEFAULT 0,
                    last_update DATETIME DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

            count = connection.execute("SELECT COUNT(*) AS count FROM coffee").fetchone()["count"]
            if count == 0:
                connection.execute("INSERT INTO coffee (counter) VALUES (67)")

    def get(self) -> Coffee:
        with self.connect() as connection:
            row = connection.execute(
                "SELECT id, counter, last_update FROM coffee LIMIT 1"
            ).fetchone()

        return Coffee.model_validate(dict(row))

    def increment(self) -> Coffee:
        with self.connect() as connection:
            row = connection.execute(
                """
                UPDATE coffee
                SET counter = counter + 1, last_update = CURRENT_TIMESTAMP
                WHERE id = (SELECT id FROM coffee LIMIT 1)
                RETURNING id, counter, last_update
                """
            ).fetchone()

        return Coffee.model_validate(dict(row))
