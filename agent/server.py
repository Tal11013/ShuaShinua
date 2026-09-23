from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os

from agent import run_conversation, init_client

app = FastAPI(title="Logistics Agent API")

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

@app.get("/api/colab_status")
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

@app.post("/chat", response_model=ChatResponse)
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
    uvicorn.run(app, host="0.0.0.0", port=8000)
