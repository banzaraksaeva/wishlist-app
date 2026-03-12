import logging
logging.getLogger("passlib").setLevel(logging.ERROR)
import sys
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    from app.routers import auth, wishlists
    app.include_router(auth.router, prefix="/auth", tags=["auth"])
    app.include_router(wishlists.router, prefix="/wishlists", tags=["wishlists"])
    print("Routers loaded: auth, wishlists")
except ImportError as e:
    print(f"Import Error: {e}")

@app.get("/")
async def root():
    return {"status": "ok", "active_routers": ["auth", "wishlists"]}
