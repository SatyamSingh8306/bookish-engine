from abc import ABC,abstractmethod

class ChatService(ABC):
    
    @abstractmethod
    def chat(self,client_id,chat_id,query):
        pass

