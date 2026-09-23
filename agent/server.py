from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os

from agent import run_conversation, init_client

app = FastAPI(title="Logistics Agent API")

AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(AGENT_DIR, "images")
os.makedirs(IMAGES_DIR, exist_ok=True)

# Generated charts only (tools save them as images/<name>.png). The Express
# server proxies /agent-assets/* here, so the browser never calls this service.
app.mount("/agent-assets/images", StaticFiles(directory=IMAGES_DIR), name="agent-images")


# The Express API is the only intended caller: it checks the user's login and
# sends this shared secret. Unset AGENT_TOKEN (local dev) disables the check.
def require_agent_token(x_agent_token: Optional[str] = Header(default=None)):
    expected = os.environ.get("AGENT_TOKEN")
    if expected and x_agent_token != expected:
        raise HTTPException(status_code=401, detail="Invalid agent token")

# Allow CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client on startup
@app.on_event("startup")
async def startup_event():
    init_client()
    print("Agent client initialized.")

class ChatRequest(BaseModel):
    user_prompt: str
    messages: Optional[List[Dict[str, Any]]] = None
    model: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    messages: List[Dict[str, Any]]
    rate_limit_info: Optional[Dict[str, Any]] = None

@app.get("/health")
async def health():
    return {"status": "ok", "service": "Logistics Agent API"}

@app.get("/api/colab_status", dependencies=[Depends(require_agent_token)])
async def colab_status():
    colab_base = os.environ.get("COLAB_API_BASE")
    if not colab_base:
        return {"status": "disconnected", "message": "No COLAB_API_BASE in .env"}
        
    try:
        import requests
        # Ollama API healthcheck
        health_url = colab_base.rstrip('/').replace('/v1', '') + '/'
        res = requests.get(health_url, timeout=3)
        if res.status_code == 200:
            return {"status": "connected", "message": "Ollama is running on Colab"}
        return {"status": "error", "message": "Tunnel reached but Ollama not responding"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/chat", response_model=ChatResponse, dependencies=[Depends(require_agent_token)])
async def chat_endpoint(request: ChatRequest):
    try:
        messages_list = request.messages if request.messages is not None else None
        
        answer, history, rate_limit_info = run_conversation(
            request.user_prompt, 
            messages=messages_list,
            model=request.model
        )
        
        # Sanitize history: Convert OpenAI objects to dicts so FastAPI can serialize them
        sanitized_history = []
        for msg in history:
            if isinstance(msg, dict):
                sanitized_history.append(msg)
            elif hasattr(msg, "model_dump"): # OpenAI v1.x objects
                sanitized_history.append(msg.model_dump(exclude_none=True))
            elif hasattr(msg, "dict"): # Fallback for older pydantic objects
                sanitized_history.append(msg.dict(exclude_none=True))
            else:
                sanitized_history.append(vars(msg))

        return ChatResponse(answer=answer, messages=sanitized_history, rate_limit_info=rate_limit_info)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8000")))
