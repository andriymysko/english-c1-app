from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import router
from app.core.config import settings
from app.routers.payment import payment_router
import firebase_admin
from firebase_admin import credentials
import os

app = FastAPI(title="English C1 Generator API")

# --- 1. CONFIGURACIÓ DE FIREBASE AMB STORAGE BUCKET ---
# Aquesta part és CRÍTICA per arreglar les imatges
if not firebase_admin._apps:
    # Assegura't que la ruta al teu fitxer JSON és correcta
    # Si fas servir una variable d'entorn per al JSON, adapta-ho aquí
    cred_path = "serviceAccountKey.json"  
    
    # Si no troba el fitxer local, mirem si està a una ruta relativa comuna
    if not os.path.exists(cred_path):
        cred_path = "app/serviceAccountKey.json"

    cred = credentials.Certificate(cred_path)
    
    firebase_admin.initialize_app(cred, {
        'storageBucket': 'english-c1-app.firebasestorage.app'  # 👈 EL TEU BUCKET AQUÍ
    })

# --- 2. CONFIGURACIÓ CORS ---
origins = [
    "http://localhost:5173",          # Per quan treballes en local
    "http://localhost:3000",
    "https://www.getaidvanced.com",   # El teu domini de producció
    "https://getaidvanced.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. RUTES ---
app.include_router(router)
app.include_router(payment_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)