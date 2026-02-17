from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials
import os
import time

# --- IMPORTACIONS DELS TEUS SERVEIS ---
# Assegura't que aquestes rutes existeixen. Si el teu router ja tenia lògica,
# aquest main.py la sobreescriurà per l'endpoint /exercise/{type} per assegurar el tir.
from app.services.generators.factory import ExerciseFactory
from app.services.db import DatabaseService 
from app.services.grader import CorrectionService
from app.routers.payment import payment_router
# from app.api.router import router  <-- Ho comentem per evitar conflictes si ja tens rutes definides allà

app = FastAPI(title="English C1 Generator API")

# ==========================================
# 1. CONFIGURACIÓ FIREBASE (La teva, correcta)
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
        print("✅ Firebase inicialitzat correctament.")
    else:
        print("⚠️ ALERTA: No s'ha trobat serviceAccountKey.json. La BD no funcionarà.")

# ==========================================
# 2. CONFIGURACIÓ CORS (La teva, correcta)
# ==========================================
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://www.getaidvanced.com",
    "https://getaidvanced.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex="https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 3. LÒGICA "POOL" (PRE-CARREGA) - EL MOTOR
# ==========================================

def generate_and_save_background(exercise_type: str, level: str):
    """
    Tasca que s'executa en segon pla (invisible per l'usuari)
    per reposar l'estoc d'exercicis a la base de dades.
    """
    print(f"🔄 [BACKGROUND] Iniciant generació silenciosa per: {exercise_type}...")
    try:
        # 1. Generar
        new_exercise = ExerciseFactory.create_exercise(exercise_type, level)
        # 2. Guardar
        DatabaseService.save_exercise(new_exercise.model_dump())
        print(f"✅ [BACKGROUND] Exercici {exercise_type} guardat a la BD per al futur.")
    except Exception as e:
        print(f"❌ [BACKGROUND ERROR] Ha fallat la generació en segon pla: {e}")

# ==========================================
# 4. ENDPOINTS PRINCIPALS
# ==========================================

@app.get("/")
def read_root():
    return {"status": "online", "message": "GetAidvanced API is running 🚀"}

@app.get("/exercise/{exercise_type}")
async def get_exercise(exercise_type: str, level: str = "C1", background_tasks: BackgroundTasks = None):
    """
    Aquest és l'endpoint intel·ligent.
    1. Busca a la BD -> Si troba, entrega ràpid i genera un altre per darrere.
    2. Si no troba -> Genera, guarda i entrega (més lent, però segur).
    """
    print(f"📥 [REQUEST] Sol·licitud d'exercici: {exercise_type}")
    
    # 1. Intentem treure un de la piscina (BD)
    try:
        existing_exercise = DatabaseService.get_random_exercise(exercise_type, level)
    except Exception as e:
        print(f"⚠️ Error connectant a BD: {e}. Passant a generació directa.")
        existing_exercise = None

    if existing_exercise:
        print("⚡ [CACHE HIT] Exercici trobat a la BD! Entregant immediatament.")
        
        # 2. Com que n'hem gastat un, posem la IA a treballar per reposar-lo
        # Això fa que la pròxima vegada també sigui ràpid.
        if background_tasks:
            background_tasks.add_task(generate_and_save_background, exercise_type, level)
            
        return existing_exercise

    # 3. Si no hi ha res a la BD (Cache Miss), toca esperar
    print("🐢 [CACHE MISS] No hi ha exercicis guardats. Generant en temps real...")
    try:
        new_exercise = ExerciseFactory.create_exercise(exercise_type, level)
        
        # 4. GUARDAR A LA BD (CRÍTIC: Això assegura que queda registrat)
        try:
            DatabaseService.save_exercise(new_exercise.model_dump())
            print("💾 Exercici nou guardat a la BD.")
        except Exception as db_err:
            print(f"⚠️ Error guardant a la BD (però l'enviem igualment): {db_err}")
        
        return new_exercise.model_dump()
        
    except Exception as e:
        print(f"❌ ERROR FATAL generant exercici: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint per corregir Writings
class WritingRequest(BaseModel):
    task_prompt: str
    user_text: str

@app.post("/grade/writing")
async def grade_writing_endpoint(request: WritingRequest):
    print("📝 Corregint writing...")
    return CorrectionService.grade_writing(request.task_prompt, request.user_text)

# --- 5. INCLOURE ALTRES ROUTERS ---
app.include_router(payment_router)

# Si tens el router antic i té coses que no són /exercise, descomenta això:
# app.include_router(router) 

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)