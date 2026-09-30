import httpx
from typing import AsyncGenerator
from app.services.providers.base import LLMProvider
from app.models.schemas import ChatCompletionRequest, ChatCompletionResponse

class GroqProvider(LLMProvider):
    def __init__(self, api_key: str):
        super().__init__(api_key)
        # Groq's OpenAI-compatible endpoint
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"

    async def generate(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = request.model_dump(exclude_none=True)
        payload["stream"] = False
        
        async with httpx.AsyncClient() as client:
            response = await client.post(self.base_url, headers=headers, json=payload, timeout=60.0)
            response.raise_for_status()
            return ChatCompletionResponse(**response.json())

    async def stream(self, request: ChatCompletionRequest) -> AsyncGenerator[str, None]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream"
        }
        
        payload = request.model_dump(exclude_none=True)
        payload["stream"] = True

        async with httpx.AsyncClient() as client:
            async with client.stream("POST", self.base_url, headers=headers, json=payload, timeout=60.0) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        yield f"{line}\n"
                    else:
                        yield "\n"