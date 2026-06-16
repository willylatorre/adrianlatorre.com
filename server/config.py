from functools import lru_cache
import os

from dotenv import load_dotenv
from pydantic import BaseModel


class Settings(BaseModel):
    database_path: str = "./adrian.db"
    server_port: int = 8080
    environment: str = "development"
    openai_api_key: str = ""
    openai_model: str = "gpt-5-mini"


@lru_cache
def get_settings() -> Settings:
    load_dotenv()

    return Settings(
        database_path=os.getenv("DB_PATH", "./adrian.db"),
        server_port=int(os.getenv("PORT", "8080")),
        environment=os.getenv("ENV", "development"),
        openai_api_key=os.getenv("OPENAI_API_KEY", ""),
        openai_model=os.getenv("OPENAI_MODEL", "gpt-5-mini"),
    )
