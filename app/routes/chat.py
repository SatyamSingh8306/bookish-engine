from fastapi import APIRouter, Depends, HTTPException,status
from pydantic import BaseModel
from app.services.ai_chat import ChatServiceProvider
from app.dependencies import verify_secret

class ChatRequest(BaseModel):
    query : str
    userid : str
    clientid : str

class PromptRequest(BaseModel):
    clientid: str
    system_prompt: str


router = APIRouter()

_chat_service = ChatServiceProvider()

@router.post("/chat")
async def chat(request : ChatRequest):
    response = _chat_service.chat(user_id=request.userid,client_id=request.clientid,query=request.query)
    return {
        "reply": response
    }

@router.post("/set-prompt", dependencies=[Depends(verify_secret)])
async def set_system_prompt(request: PromptRequest):
    success = _chat_service.set_system_prompt(
        client_id=request.clientid,
        prompt=request.system_prompt
    )

    if success is not None:
        return {
            "clientid": request.clientid,
            "system_prompt": request.system_prompt
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error occurred while setting your system prompt"
        )

@router.get("/get-prompt/{clientid}", dependencies=[Depends(verify_secret)])
async def get_system_prompt(clientid: str):
    prompt = _chat_service.get_system_prompt(client_id=clientid)
    if prompt:
        return {"clientid": clientid, "system_prompt": prompt}
    raise HTTPException(status_code=404, detail="Client not registered")

