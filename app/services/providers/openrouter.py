import httpx
from typing import AsyncGenerator, Union
from app.services.providers.base import LLMProvider
from app.models.schemas import ChatCompletionRequest, ChatCompletionResponse

class OpenRouterProvider(LLMProvider):
    def __init__(self, api_key: str):
        super().__init__(api_key)
        # OpenRouter's endpoint
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"

    def _get_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            # Optional but recommended by OpenRouter
            "HTTP-Referer": "https://github.com/yourusername/llm-gateway",
            "X-Title": "My LLM Gateway"
        }

    async def generate(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        payload = request.model_dump(exclude_none=True)
        payload["stream"] = False
        
        async with httpx.AsyncClient() as client:
            response = await client.post(self.base_url, headers=self._get_headers(), json=payload, timeout=60.0)
            response.raise_for_status()
            return ChatCompletionResponse(**response.json())

    async def stream(self, request: ChatCompletionRequest) -> AsyncGenerator[Union[str, bytes], None]:
        headers = self._get_headers()
        headers["Accept"] = "text/event-stream"
        
        payload = request.model_dump(exclude_none=True)
        payload["stream"] = True

        async with httpx.AsyncClient() as client:
            async with client.stream("POST", self.base_url, headers=headers, json=payload, timeout=60.0) as response:
                response.raise_for_status()
                async for chunk in response.aiter_bytes():
                    yield chunk