from dotenv import load_dotenv
load_dotenv()
from os import getenv
from fastapi import HTTPException,status

GROQ_API_KEY = getenv("GROQ_API_KEY")
SECRET_KEY = getenv("SECRET_KEY")

REDIS_HOST = getenv("REDIS_HOST", "localhost")
REDIS_PORT = getenv("REDIS_PORT",6379)
REDIS_USERNAME = getenv("REDIS_USERNAME","default")
REDIS_PASSWORD = getenv("REDIS_PASSWORD")

HOST = getenv("HOST","0.0.0.0")
PORT = getenv("PORT",8000)

mandatory = [GROQ_API_KEY, REDIS_HOST, REDIS_PORT, REDIS_PASSWORD]

for cred in mandatory:
    if cred is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="Credentionals are missing")