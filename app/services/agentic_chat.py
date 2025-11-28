from app.services.base import ChatService
from app import GROQ_API_KEY
from typing import Annotated
from langchain_groq import ChatGroq
from app.services.redis import RedisService
from langchain.agents import create_agent
from app.services.tools import online_search,staticWebScrapper,dynamicWebScrapper
from langchain_core.messages import SystemMessage,HumanMessage
from langchain_core.prompts import ChatPromptTemplate,MessagesPlaceholder
from typing import Optional 
from fastapi import HTTPException,status
from typing import List, Dict,Any
import json
import logging

logging.basicConfig(
    filename="agent.log",
    level=logging.INFO,
)
logger = logging.getLogger("agent")

class AgenticChat(ChatService):
    def __init__(self,
                model_name:Annotated[str,"Model Name that be used"]="openai/gpt-oss-20b",
                temperature : Annotated[int ,"Cretivity of LLM"]=0.2,
                system_prompt : Annotated[str,"System prompt for LLM"]="You are AN Helpful CHatbot",
                api_key : Annotated[str,"API of Inference Platform"]=GROQ_API_KEY,
        
            ):
        self.model = ChatGroq(model=model_name,
                            temperature=temperature,
                            api_key=api_key)
        self.tools = [online_search,staticWebScrapper,dynamicWebScrapper]
        self.agent = create_agent(
            model=self.model,
            tools=self.tools,
            system_prompt=system_prompt
        )
        self.cache = RedisService()
        self.system_prompt_key_prefix = "system_prompt"
        logger.info("Agent Chat Initialised")
        
    def set_system_prompt(self, client_id: str, prompt: str)->bool:
        try:
            key = f"{self.system_prompt_key_prefix}:{client_id}"
            self.cache.set_value(key, prompt)
            return True
        except Exception as e:
            return False
    
    def __maintain_chat_history(self,system_prompt: str, query: str, chats : Any)->str:
        _template = [{'role' : "system",'content' : system_prompt}] + chats + [{'role' : 'human','content' :query}]
        # ChatPromptTemplate.from_messages(
        #     messages=[
        #         {'system' : system_prompt},
        #         MessagesPlaceholder(variable_name=chats),
        #         {'human' : query}
        #     ]
        # )
        logging.debug("Maintaiing the Chat History......")
        return _template

    def get_system_prompt(self, client_id: str) -> Optional[str]:
        key = f"{self.system_prompt_key_prefix}:{client_id}"
        return self.cache.get_value(key)

    async def chat(self, user_id: str, client_id: str, query: str) -> Optional[str]:
        try:
            chat_id = f"{user_id}:{client_id}"
            chats = self.cache.get_messages(chat_id=chat_id)
            logging.info("chat history imported")
            logging.info(f"{chats}")

            system_prompt = self.get_system_prompt(client_id)
            if not system_prompt:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Client not registered or unauthorized."
                )
            logging.info("System prompt imported.....")
            
            chat_input = self.__maintain_chat_history(system_prompt=system_prompt,query=query,chats=chats)

            reply = await self.agent.ainvoke({'messages' : chat_input})
            reply = reply['messages'][-1].content

            bot_msg = {"role": "assistant", "text": reply}
            self.cache.store_message(chat_id, json.dumps(bot_msg))

            return reply

        except Exception as e:
            logger.error(f"{e}")
            return f"Error occurred: {e}"
    
if __name__ == "__main__":
    _agent = AgenticChat()
    response = _agent.chat(client_id="satyam", user_id="satyam1", query="Hii dude")
    print(response)