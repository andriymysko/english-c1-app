from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import router
from app.core.config import settings

app = FastAPI(title="English C1 Generator API")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "https://english-c1-app.vercel.app"
]

# Configuració CORS per permetre connexió amb el Frontend (Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # definit a config.py
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)