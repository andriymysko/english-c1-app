from fastapi import FastAPI, HTTPException, BackgroundTasks, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials
import os
from openai import OpenAI
from typing import List, Optional

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
# 3. MODELS DE DADES (Pydantic)
# ==========================================
class TTSRequest(BaseModel):
    text: str

class ResultRequest(BaseModel):
    user_id: str
    exercise_type: str
    score: int
    total: int
    exercise_id: Optional[str] = None
    mistakes: Optional[List[dict]] = []

class WritingRequest(BaseModel):
    task_prompt: str
    user_text: str

# ==========================================
# 4. LÒGICA BACKGROUND
# ==========================================
def generate_and_save_background(exercise_type: str, level: str):
    try:
        new_exercise = ExerciseFactory.create_exercise(exercise_type, level)
        DatabaseService.save_exercise(new_exercise.model_dump())
        print(f"✅ [BACKGROUND] Exercici {exercise_type} guardat.")
    except Exception as e:
        print(f"❌ [BACKGROUND ERROR]: {e}")

# ==========================================
# 5. ENDPOINTS
# ==========================================

@app.get("/")
def read_root():
    return {"status": "online", "server": "Render"}

@app.post("/tts")
async def text_to_speech(request: TTSRequest):
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    try:
        response = client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=request.text
        )
        return Response(content=response.content, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    try:
        existing_exercise = DatabaseService.get_random_exercise(exercise_type, level)
    except Exception as e:
        existing_exercise = None

    if existing_exercise:
        if background_tasks:
            background_tasks.add_task(generate_and_save_background, exercise_type, level)
        return existing_exercise

    print("🐢 [CACHE MISS] Generant en temps real...")
    try:
        new_exercise = ExerciseFactory.create_exercise(exercise_type, level)
        
        # ⚠️ CONSELL PRO: Convertim a dict i forcem els camps de cerca
        exercise_dict = new_exercise.model_dump()
        exercise_dict["type"] = exercise_type
        exercise_dict["level"] = level

        if background_tasks:
            # Usem el diccionari ja preparat
            background_tasks.add_task(DatabaseService.save_exercise, exercise_dict)
        
        return exercise_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

# ✅ NOU: Endpoint per guardar resultats (Evita el 404)
@app.post("/submit_result")
async def submit_result_endpoint(request: ResultRequest):
    print(f"📊 Rebut resultat per a l'usuari: {request.user_id}")
    try:
        # Aquí cridem a la teva funció de DB per guardar la nota
        success = DatabaseService.save_user_result(
            user_id=request.user_id,
            exercise_data={"id": request.exercise_id, "type": request.exercise_type},
            score=request.score,
            total=request.total,
            mistakes=request.mistakes
        )
        return {"status": "success", "updated_stats": success}
    except Exception as e:
        print(f"❌ Error guardant resultat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/grade/writing")
async def grade_writing_endpoint(request: WritingRequest):
    return CorrectionService.grade_writing(request.task_prompt, request.user_text)

# --- INCLOURE ROUTERS ---
app.include_router(payment_router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)