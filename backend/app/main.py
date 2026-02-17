from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials
import os

# --- IMPORTACIONS DELS TEUS SERVEIS ---
from app.services.generators.factory import ExerciseFactory
from app.services.db import DatabaseService 
from app.services.grader import CorrectionService
from app.routers.payment import payment_router

app = FastAPI(title="English C1 Generator API")

# ==========================================
# 1. CONFIGURACIÓ FIREBASE
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
        print("⚠️ ALERTA: No s'ha trobat serviceAccountKey.json.")

# ==========================================
# 2. CONFIGURACIÓ CORS (CORREGIDA)
# ==========================================
# Afegim "allow_origin_regex" amb r"" per evitar errors de sintaxi i 
# eixamplem les opcions per evitar el bloqueig del navegador.
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://www.getaidvanced.com",
    "https://getaidvanced.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app", # La 'r' evita l'error de "invalid escape sequence"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 3. LÒGICA "POOL" (PRE-CARREGA)
# ==========================================
def generate_and_save_background(exercise_type: str, level: str):
    print(f"🔄 [BACKGROUND] Generant exercici de reserva: {exercise_type}...")
    try:
        new_exercise = ExerciseFactory.create_exercise(exercise_type, level)
        DatabaseService.save_exercise(new_exercise.model_dump())
        print(f"✅ [BACKGROUND] Exercici {exercise_type} guardat.")
    except Exception as e:
        print(f"❌ [BACKGROUND ERROR]: {e}")

# ==========================================
# 4. ENDPOINTS
# ==========================================

@app.get("/")
def read_root():
    return {"status": "online", "server": "Render"}

# Endpoint per a les estadístiques (Evita el 404 del Frontend)
@app.get("/user_stats/{user_id}")
async def get_user_stats_endpoint(user_id: str):
    try:
        stats = DatabaseService.get_user_stats(user_id)
        if not stats:
            return {"xp": 0, "streak": 0, "completed": 0}
        return stats
    except Exception as e:
        return {"xp": 0, "streak": 0, "error": str(e)}

@app.get("/exercise/{exercise_type}")
async def get_exercise(exercise_type: str, level: str = "C1", background_tasks: BackgroundTasks = None):
    print(f"📥 [REQUEST]: {exercise_type}")
    
    # 1. Intentem treure de la BD
    try:
        existing_exercise = DatabaseService.get_random_exercise(exercise_type, level)
    except Exception as e:
        print(f"⚠️ Error BD: {e}")
        existing_exercise = None

    if existing_exercise:
        print("⚡ [CACHE HIT]")
        if background_tasks:
            background_tasks.add_task(generate_and_save_background, exercise_type, level)
        return existing_exercise

    # 2. Si no hi ha res, generem en temps real
    print("🐢 [CACHE MISS] Generant...")
    try:
        new_exercise = ExerciseFactory.create_exercise(exercise_type, level)
        # Guardem a la BD (opcionalment en background per no frenar la resposta)
        if background_tasks:
            background_tasks.add_task(DatabaseService.save_exercise, new_exercise.model_dump())
        
        return new_exercise.model_dump()
    except Exception as e:
        print(f"❌ ERROR GENERACIÓ: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class WritingRequest(BaseModel):
    task_prompt: str
    user_text: str

@app.post("/grade/writing")
async def grade_writing_endpoint(request: WritingRequest):
    return CorrectionService.grade_writing(request.task_prompt, request.user_text)

# --- INCLOURE ROUTERS ---
app.include_router(payment_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))