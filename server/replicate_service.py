from replicate import Client


IMAGE_PROMPT_PREFIX = (
    "A 32-bit pixel art scene in the style of a retro adventure RPG, viewed in an "
    "isometric perspective. The color palette is cohesive, dominated by shades of teal, "
    "turquoise, and cool blues. The lighting is soft and slightly moody. The art should "
    "look like it belongs to the same game world as other scenes with this style - "
    "consistent pixel density, same resolution, and same color tones. Resolution: 256x256. "
    "Scene description: "
)


class ReplicateService:
    def __init__(self, api_key: str) -> None:
        self.api_key = api_key
        self.client = Client(api_token=api_key) if api_key else None

    async def generate_image(self, prompt: str) -> str:
        if self.client is None:
            raise RuntimeError("replicate client not configured")

        enhanced_prompt = f"{IMAGE_PROMPT_PREFIX}{prompt}"

        output = await self.client.async_run(
            "google/nano-banana-2",
            input={
                "prompt": enhanced_prompt,
                "resolution": "1K",
                "image_input": [],
                "aspect_ratio": "1:1",
                "image_search": False,
                "google_search": False,
                "output_format": "jpg",
            },
        )

        if hasattr(output, "url"):
            return output.url
        raise RuntimeError("no image generated")
