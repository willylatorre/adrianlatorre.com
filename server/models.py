from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


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
