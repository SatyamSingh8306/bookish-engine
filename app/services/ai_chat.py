from langchain_groq import ChatGroq
from app import GROQ_API_KEY
from typing import Optional
from app.services.redis import RedisService
import json
from fastapi import HTTPException,status

class ChatServiceProvider:
    def __init__(self,
                model: str = "openai/gpt-oss-20b",
                temperature: float = 0.4,
                api_key: str = GROQ_API_KEY):
        
        self._llm = ChatGroq(
            model=model,
            temperature=temperature,
            api_key=api_key
        )

        self.cache = RedisService()
        self.system_prompt_key_prefix = "system_prompt"

    def set_system_prompt(self, client_id: str, prompt: str)->bool:
        try:
            key = f"{self.system_prompt_key_prefix}:{client_id}"
            self.cache.set_value(key, prompt)
            return True
        except Exception as e:
            return False

    def get_system_prompt(self, client_id: str) -> Optional[str]:
        key = f"{self.system_prompt_key_prefix}:{client_id}"
        return self.cache.get_value(key)

    def chat(self, user_id: str, client_id: str, query: str) -> Optional[str]:
        try:
            chat_id = f"{user_id}:{client_id}"

            system_prompt = self.get_system_prompt(client_id)
            if system_prompt:
                system_msg = {"role": "system", "text": system_prompt}
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Client not registered or unauthorized."
                )

            user_msg = {"role": "user", "text": query}
            self.cache.store_message(chat_id, json.dumps(user_msg))

            history = self.cache.get_messages(chat_id)

            formatted_history = ""
            if system_msg:
                formatted_history += f"system: {system_msg['text']}\n"

            formatted_history += "\n".join(
                f"{json.loads(m)['role']}: {json.loads(m)['text']}" for m in history
            )

            prompt = f"{formatted_history}\nuser: {query}"

            response = self._llm.invoke(prompt)
            reply = response.content

            bot_msg = {"role": "assistant", "text": reply}
            self.cache.store_message(chat_id, json.dumps(bot_msg))

            return reply
        
        except Exception as e:
            return f"Error occurred: {e}"


if __name__ == "__main__":
    chat_service = ChatServiceProvider(model="openai/gpt-oss-20b")
    chat_service.set_system_prompt("15", "You are an AI assistant that remembers conversation context and behaves politely.")
    response = chat_service.chat("12", "15", "What did I ask you before?")
    print(response)
