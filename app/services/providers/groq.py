import json
import httpx
from typing import AsyncGenerator, Union
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

    async def stream(self, request: ChatCompletionRequest) -> AsyncGenerator[Union[str, bytes], None]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream"
        }
        
        payload = request.model_dump(exclude_none=True)
        payload["stream"] = True

        async with httpx.AsyncClient() as client:
            async with client.stream("POST", self.base_url, headers=headers, json=payload, timeout=60.0) as response:
                if response.status_code != 200:
                    err_bytes = await response.aread()
                    err_msg = err_bytes.decode('utf-8', errors='ignore')
                    err_payload = json.dumps({"choices": [{"delta": {"content": f"⚠️ [Groq Error {response.status_code}]: {err_msg}"}}]})
                    yield f"data: {err_payload}\n\n".encode("utf-8")
                    yield b"data: [DONE]\n\n"
                    return
                async for chunk in response.aiter_bytes():
                    yield chunk