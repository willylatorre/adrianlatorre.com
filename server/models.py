from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ChatMessage(BaseModel):
    id: str
    role: str
    content: str
    timestamp: datetime


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(default_factory=list)
    prompt: str = Field(min_length=1)


class ChatResponse(BaseModel):
    chunk: str


class ImageGenerationRequest(BaseModel):
    prompt: str = Field(min_length=1)


class ImageGenerationResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    image_url: str


class OrchestratorRequest(BaseModel):
    prompt: str = Field(min_length=1)


HashiCategory = Literal["intro", "daily", "weekly", "monthly"]


class HashiScoreCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    category: HashiCategory
    puzzle_fingerprint: str = Field(
        alias="puzzleFingerprint",
        min_length=16,
        max_length=64,
        pattern=r"^[a-zA-Z0-9_-]+$",
    )
    nickname: str = Field(min_length=1, max_length=20, pattern=r"^[^\x00-\x1f<>]+$")
    duration_ms: int = Field(alias="durationMs", ge=1_000, le=604_800_000)

    @field_validator("nickname")
    @classmethod
    def nickname_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("nickname must not be blank")
        return value


class HashiScore(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    nickname: str
    duration_ms: int = Field(alias="durationMs")
    created_at: datetime = Field(alias="createdAt")


class HashiLeaderboardResponse(BaseModel):
    model_config = ConfigDict(serialize_by_alias=True)

    category: HashiCategory
    entries: list[HashiScore]
