from collections.abc import AsyncIterator
from pathlib import Path

from openai import AsyncOpenAI

from .context_loader import ContextLoader
from .models import ChatMessage


DEFAULT_SYSTEM_PROMPT = (
    "You are Adrian Latorre, a software engineer being interviewed. Answer questions about your "
    "life experiences, career journey, hobbies, interests, and memorable moments in a genuine and "
    "conversational way, but keep them short, a couple of sentences max. Be authentic, thoughtful, "
    "and share personal anecdotes. Keep your responses natural and engaging, as if chatting with a friend."
)


class OpenAIService:
    def __init__(self, api_key: str, pages_dir: Path, model: str) -> None:
        self.client = AsyncOpenAI(api_key=api_key) if api_key else None
        self.model = model
        self.system_prompt = ContextLoader(pages_dir).build_enhanced_system_prompt(
            DEFAULT_SYSTEM_PROMPT
        )

    async def stream_chat(
        self, history: list[ChatMessage], prompt: str
    ) -> AsyncIterator[str]:
        if self.client is None:
            raise RuntimeError("openai client not configured")

        model_input: list[dict[str, str]] = [
            {"role": "system", "content": self.system_prompt},
        ]

        for message in history:
            content = message.content.strip()
            role = message.role.lower()
            if content and role in {"user", "assistant", "system"}:
                model_input.append({"role": role, "content": content})

        model_input.append({"role": "user", "content": prompt})

        stream = await self.client.responses.create(
            model=self.model,
            input=model_input,
            stream=True,
        )

        async for event in stream:
            if event.type == "response.output_text.delta" and event.delta:
                yield event.delta
            elif event.type == "error":
                raise RuntimeError(str(event))

    async def generate_image(self, prompt: str) -> str:
        if self.client is None:
            raise RuntimeError("openai client not configured")

        enhanced_prompt = (
            "A 32-bit pixel art scene in the style of a retro adventure RPG, viewed in an "
            "isometric perspective. The color palette is cohesive, dominated by shades of teal, "
            "turquoise, and cool blues. The lighting is soft and slightly moody. The art should "
            "look like it belongs to the same game world as other scenes with this style - "
            "consistent pixel density, same resolution, and same color tones. Resolution: 256x256. "
            f"Scene description: {prompt}"
        )

        response = await self.client.images.generate(
            model="gpt-image-1.5",
            prompt=enhanced_prompt,
            size="1024x1024",
            quality="medium",
        )

        if not response.data:
            raise RuntimeError("no image generated")

        image = response.data[0]
        if image.url:
            return image.url
        if image.b64_json:
            return f"data:image/png;base64,{image.b64_json}"
        raise RuntimeError("no image generated")
