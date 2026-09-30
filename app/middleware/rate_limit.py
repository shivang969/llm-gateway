import time
import logging
from fastapi import HTTPException
from redis.asyncio import Redis

logger = logging.getLogger("gateway.ratelimit")

class RateLimiter:
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self.redis = Redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=0.3, socket_timeout=0.3)
        self.redis_available = None  # None = untried, True = active, False = fallback
        self._memory_tpm = {}        # key: f"{team_id}:{minute}" -> token count
        self._memory_spend = {}      # key: team_id -> float total spend

    async def _is_redis_working(self) -> bool:
        if self.redis_available is False:
            return False
        try:
            await self.redis.ping()
            self.redis_available = True
            return True
        except Exception:
            if self.redis_available is not False:
                logger.warning("[GATEWAY] Redis is offline. RateLimiter seamlessly switching to in-memory dual-engine fallback.")
            self.redis_available = False
            return False

    async def check_rate_limit(self, team_id: str, tokens_requested: int, max_tokens_per_minute: int):
        current_minute = int(time.time() // 60)
        redis_key = f"rate_limit:{team_id}:{current_minute}"

        use_redis = await self._is_redis_working()
        if use_redis:
            try:
                current_usage = await self.redis.incrby(redis_key, tokens_requested)
                if current_usage == tokens_requested:
                    await self.redis.expire(redis_key, 60)
            except Exception:
                self.redis_available = False
                use_redis = False

        if not use_redis:
            # In-memory token bucket tracking
            prev = self._memory_tpm.get(redis_key, 0)
            current_usage = prev + tokens_requested
            self._memory_tpm[redis_key] = current_usage
            # Clean up older minutes
            old_keys = [k for k in self._memory_tpm if not k.endswith(f":{current_minute}")]
            for k in old_keys:
                self._memory_tpm.pop(k, None)

        if current_usage > max_tokens_per_minute:
            retry_after = 60 - int(time.time() % 60)
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded for team '{team_id}'. Current usage: {current_usage}/{max_tokens_per_minute} TPM.",
                headers={"Retry-After": str(retry_after)}
            )
        return current_usage

    async def check_budget(self, team_id: str, max_budget_usd: float) -> float:
        """
        Checks if a team has exceeded their total dollar budget.
        Raises HTTP 403 Forbidden if they are out of funds.
        """
        current_spend = 0.0
        use_redis = await self._is_redis_working()
        if use_redis:
            try:
                redis_key = f"spend:{team_id}"
                val = await self.redis.get(redis_key)
                current_spend = float(val) if val else 0.0
            except Exception:
                self.redis_available = False
                use_redis = False

        if not use_redis:
            current_spend = float(self._memory_spend.get(team_id, 0.0))

        if current_spend >= max_budget_usd:
            raise HTTPException(
                status_code=403, 
                detail=f"Budget exceeded. Team '{team_id}' has spent ${current_spend:.6f} / ${max_budget_usd:.6f}."
            )
        return current_spend

    async def add_spend(self, team_id: str, cost: float):
        """
        Atomically adds the cost of a completed request to the team's total spend tracker.
        """
        if cost <= 0:
            return

        use_redis = await self._is_redis_working()
        if use_redis:
            try:
                redis_key = f"spend:{team_id}"
                await self.redis.incrbyfloat(redis_key, cost)
            except Exception:
                self.redis_available = False
                use_redis = False

        if not use_redis:
            self._memory_spend[team_id] = self._memory_spend.get(team_id, 0.0) + cost

    async def get_team_usage(self, team_id: str) -> dict:
        """Helper to get current minute TPM and total spend for dashboard telemetry."""
        current_minute = int(time.time() // 60)
        redis_key = f"rate_limit:{team_id}:{current_minute}"
        spend_key = f"spend:{team_id}"
        
        tpm = 0
        spend = 0.0
        use_redis = await self._is_redis_working()

        if use_redis:
            try:
                tpm_val = await self.redis.get(redis_key)
                spend_val = await self.redis.get(spend_key)
                tpm = int(tpm_val) if tpm_val else 0
                spend = float(spend_val) if spend_val else 0.0
            except Exception:
                use_redis = False

        if not use_redis:
            tpm = int(self._memory_tpm.get(redis_key, 0))
            spend = float(self._memory_spend.get(team_id, 0.0))

        return {
            "current_tpm": tpm,
            "current_spend": spend,
            "redis_connected": bool(use_redis)
        }