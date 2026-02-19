from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials
import os

# --- IMPORTACIÓ DE CONFIGURACIÓ ---
from app.core.config import settings # Utilitzem el teu config.py per a variables d'entorn!

# --- IMPORTACIONS DELS TEUS ROUTERS ---
# ⚠️ NOTA: Ajusta l'estructura 'app.routers...' segons on tinguis els arxius realment
from app.api.router import router as exercises_router 
from app.routers.payment import payment_router 

# ==========================================
# 1. CONFIGURACIÓ FIREBASE (L'ÚNIC LLOC ON S'INICIALITZA)
# ==========================================
if not firebase_admin._apps:
    cred_path = "serviceAccountKey.json"  
    if not os.path.exists(cred_path):
        cred_path = "app/serviceAccountKey.json"

    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {
            'storageBucket': 'english-c1-app.firebasestorage.app'
        })
        print("✅ Firebase inicialitzat correctament des de main.py.")
    else:
        print("⚠️ ALERTA: No s'ha trobat serviceAccountKey.json.")

# Inicialitzem l'App
app = FastAPI(title="English C1 Generator API")

# ==========================================
# 2. CONFIGURACIÓ CORS
# ==========================================
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://www.getaidvanced.com",
    "https://getaidvanced.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app", 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 3. ENDPOINT DE SALUT (Healthcheck)
# ==========================================
@app.get("/")
def read_root():
    return {"status": "online", "server": "Render"}

# ==========================================
# 4. REGISTRE DE ROUTERS (LA MÀGIA DE FASTAPI)
# ==========================================
# Aquí deleguem tota la feina als teus altres arxius
app.include_router(exercises_router)
app.include_router(payment_router, prefix="/payment") # Recomano un prefix per endreçar les URLs de Stripe

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)