from abc import ABC, abstractmethod
from typing import AsyncGenerator
from app.models.schemas import ChatCompletionRequest, ChatCompletionResponse

class LLMProvider(ABC):
    def __init__(self, api_key: str):
        self.api_key = api_key

    @abstractmethod
    async def generate(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        """Handles standard, blocking completions and returns the full unified response."""
        pass

    @abstractmethod
    async def stream(self, request: ChatCompletionRequest) -> AsyncGenerator[str, None]:
        """Yields Server-Sent Events (SSE) string chunks for streaming responses."""
        pass