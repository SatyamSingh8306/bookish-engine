from fastapi import FastAPI
from app.routes.chat import router
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI(title="AI Chat Integration Service")

@app.get("/")
def home():
    return {
        "version" : "1",
        "description" : "AI Chatbot Integration"
    }

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change later to exact domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router,prefix="/api")
