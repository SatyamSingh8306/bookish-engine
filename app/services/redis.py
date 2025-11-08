import redis
from typing import Optional, List
from app import REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_USERNAME

class RedisService:
    def __init__(self, host: str = REDIS_HOST, port: int = REDIS_PORT,
                 username: str = REDIS_USERNAME, password: str = REDIS_PASSWORD):
        self.redis = redis.Redis(
            host=host,
            port=port,
            username=username,
            password=password,
            decode_responses=True
        )

    def set_value(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        """
        Store a key-value pair (e.g., system prompt).
        Optionally set an expiration time in seconds.
        """
        result = self.redis.set(key, value, ex=ex)
        return result == True or result == "OK"

    def get_value(self, key: str) -> Optional[str]:
        """Retrieve value by key"""
        return self.redis.get(key)

    def delete_key(self, key: str) -> None:
        """Delete a key (system prompt or chat history)"""
        self.redis.delete(key)

    def check_redis_key(self, chat_id: str) -> bool:
        """Check if chat history exists"""
        return self.redis.exists(f"chat:{chat_id}") == 1

    def store_message(self, chat_id: str, message: str) -> None:
        """Store a chat message (append to list)"""
        self.redis.rpush(f"chat:{chat_id}", message)

    def get_messages(self, chat_id: str) -> List[str]:
        """Retrieve full chat history"""
        return self.redis.lrange(f"chat:{chat_id}", 0, -1)

    def delete_chat(self, chat_id: str) -> None:
        """Delete chat history"""
        self.redis.delete(f"chat:{chat_id}")
