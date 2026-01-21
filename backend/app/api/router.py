from fastapi import APIRouter, HTTPException, Response, UploadFile, File
from app.services.generators.factory import ExerciseFactory
from app.services.pdf.generator import generate_pdf_file
from app.services.db import DatabaseService
from app.services.generators.review import ReviewGenerator
from app.services.generators.vocabulary import VocabularyGenerator
from app.services.generators.exam import ExamGenerator
from app.services.grader import Grader
from app.services.audio import AudioService
from pydantic import BaseModel
from typing import Optional, List, Any
from collections import Counter
import os
import tempfile
import base64
from openai import OpenAI
import json

router = APIRouter()

# --- MODELS DE DADES ---

class ExerciseRequest(BaseModel):
    user_id: str
    level: str = "C1"
    exercise_type: str
    completed_ids: List[str] = []

class WritingSubmission(BaseModel):
    user_id: str
    task_text: str
    user_text: str
    level: str = "C1"

# --- CORRECCIÓ 422: Aquest model ha de coincidir amb el Frontend ---
class UserResult(BaseModel):
    user_id: str
    exercise_type: str              # <--- Abans era dins de exercise_data
    exercise_id: Optional[str] = None # <--- Abans era dins de exercise_data
    score: int
    total: int
    mistakes: List[Any]

class AudioRequest(BaseModel):
    text: str

class FlashcardUpdate(BaseModel):
    card_id: str
    success: bool

class ReportRequest(BaseModel):
    user_id: str
    exercise_id: str | None = None
    question_index: int
    reason: str
    exercise_data: dict

class ExamRequest(BaseModel):
    user_id: str
    level: str = "C1"

class CoachAnalysis(BaseModel):
    weaknesses: List[str]
    advice: str

# --- HELPER FUNCTION ---
def generate_and_save_exercise(level: str, exercise_type: str, is_public: bool = True):
    print(f"🤖 GENERANT NOU EXERCICI ({exercise_type})...")
    exercise_object = ExerciseFactory.create_exercise(exercise_type, level)
    exercise_data = exercise_object.model_dump()
    
    if exercise_type.startswith("listening"):
        try:
            audio_bytes = AudioService.generate_audio(exercise_data['text'])
            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
            exercise_data['audio_base64'] = audio_base64
        except Exception as e:
            print(f"⚠️ Error generant àudio inicial: {e}")

    doc_id = DatabaseService.save_exercise(exercise_data, level, exercise_type, is_public=is_public)
    exercise_data['id'] = doc_id
    return exercise_data

# --- ENDPOINTS ---

@router.post("/get_exercise/")
def get_exercise_data(request: ExerciseRequest):
    try:
        # 1. Intentem reutilitzar (GRATIS)
        existing = DatabaseService.get_existing_exercise(
            request.level, 
            request.exercise_type, 
            request.completed_ids
        )
        if existing:
            print("✨ REUTILITZANT EXERCICI DB (Cost: 0)")
            return existing

        # 2. Si no, hem de generar (COSTA DINERS) -> COMPROVEM QUOTA
        can_generate = DatabaseService.check_user_quota(request.user_id, cost=1)
        if not can_generate:
            raise HTTPException(status_code=429, detail="Daily limit reached (10/10). Come back tomorrow!")

        return generate_and_save_exercise(request.level, request.exercise_type, is_public=True)

    except HTTPException as he: raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/preload_exercise/")
def preload_exercise(request: ExerciseRequest):
    """Genera exercicis en segon pla si no n'hi ha (BUFFERING)"""
    try:
        # 1. Mirem si ja en tenim algun de públic llest a la DB
        existing = DatabaseService.get_existing_exercise(
            request.level, 
            request.exercise_type, 
            request.completed_ids
        )
        if existing:
            return {"status": "buffered"}

        # 2. Si no n'hi ha, en generem un de nou
        print("⚡ BACKGROUND: Buffer buit! Generant exercici complet...")
        generate_and_save_exercise(request.level, request.exercise_type, is_public=True)
        return {"status": "generated"}

    except Exception as e:
        print(f"⚠️ Background Error: {e}")
        return {"status": "error"}

@router.post("/submit_result/")
def submit_result(result: UserResult):
    try:
        # Reconstruïm l'estructura que espera el servei de DB
        # El servei espera un dict amb 'id' i 'type'
        simulated_exercise_data = {
            "id": result.exercise_id,
            "type": result.exercise_type
        }
        
        gamification = DatabaseService.save_user_result(
            result.user_id, 
            simulated_exercise_data, 
            result.score, 
            result.total, 
            result.mistakes
        )
        return {"status": "saved", "gamification": gamification}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate_full_exam/")
def generate_full_exam(request: ExamRequest):
    try:
        if not DatabaseService.check_user_quota(request.user_id, cost=1): 
             raise HTTPException(status_code=429, detail="Daily limit reached. Cannot generate full exam.")
        
        return ExamGenerator.generate_full_exam(request.level)
    except HTTPException as he: raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user_stats/{user_id}")
def get_user_stats(user_id: str):
    return DatabaseService.get_user_stats(user_id)

@router.post("/report_issue/")
def report_issue(report: ReportRequest):
    DatabaseService.report_issue(report.user_id, report.exercise_id, report.question_index, report.reason, report.exercise_data)
    return {"status": "reported"}

@router.post("/generate_review/{user_id}")
def generate_review(user_id: str):
    if not DatabaseService.check_user_quota(user_id, cost=1):
        raise HTTPException(status_code=429, detail="Daily limit reached.")
        
    stats = DatabaseService.get_user_stats(user_id)
    mistakes = stats.get("mistakes_pool", [])
    if not mistakes: raise HTTPException(status_code=404, detail="NO_MISTAKES")
    
    mistake_types = [m.get('type', 'reading_and_use_of_language1') for m in mistakes]
    target_type = Counter(mistake_types).most_common(1)[0][0] if mistake_types else "reading_and_use_of_language1"
    
    gen = ReviewGenerator(mistakes, target_type)
    ex = gen.generate("C1").model_dump()
    ex['id'] = DatabaseService.save_exercise(ex, "C1", "review", is_public=False)
    return ex

@router.get("/vocabulary_flashcards/{user_id}")
def get_flashcards(user_id: str):
    existing = DatabaseService.get_user_flashcards(user_id)
    if len(existing) >= 5: return {"flashcards": existing}
    
    if not DatabaseService.check_user_quota(user_id, cost=1):
         return {"flashcards": existing}

    stats = DatabaseService.get_user_stats(user_id)
    mistakes = stats.get("mistakes_pool", [])
    if not mistakes: return {"flashcards": []}
    
    gen = VocabularyGenerator()
    data = gen.generate_flashcards(mistakes)
    new = data.get("flashcards", [])
    if new:
        DatabaseService.save_generated_flashcards(user_id, new)
        return {"flashcards": DatabaseService.get_user_flashcards(user_id)}
    return {"flashcards": []}

@router.post("/update_flashcard/{user_id}")
def update_flashcard(user_id: str, update: FlashcardUpdate):
    DatabaseService.update_flashcard_priority(user_id, update.card_id, update.success)
    return {"status": "updated"}

@router.post("/grade_writing/")
def grade_writing(request: WritingSubmission):
    return Grader.grade_essay(request.user_text, request.task_text, request.level)

@router.post("/grade_speaking/")
def grade_speaking(request: WritingSubmission):
    return Grader.grade_speaking(request.user_text, request.task_text, request.level)

@router.post("/transcribe_audio/")
def transcribe_audio(file: UploadFile = File(...)):
    import tempfile
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(file.file.read())
        path = tmp.name
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    with open(path, "rb") as f:
        t = client.audio.transcriptions.create(model="whisper-1", file=f)
    os.unlink(path)
    return {"text": t.text}

@router.post("/generate_audio/")
def generate_audio_endpoint(request: AudioRequest):
    b = AudioService.generate_audio(request.text)
    return Response(content=b, media_type="audio/mpeg")

@router.get("/generate_pdf/")
def generate_pdf(level: str="C1", exercise_type: str="reading_and_use_of_language1"):
    ex = ExerciseFactory.create_exercise(exercise_type, level).model_dump()
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        generate_pdf_file(ex, tmp.name)
        path = tmp.name
    with open(path, "rb") as f: c = f.read()
    os.unlink(path)
    return Response(content=c, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=ex.pdf"})

@router.get("/analyze_weaknesses/{user_id}")
def analyze_weaknesses(user_id: str):
    # 1. Recuperem els errors
    stats = DatabaseService.get_user_stats(user_id)
    mistakes = stats.get("mistakes_pool", [])
    
    if len(mistakes) < 3:
        return {
            "analysis": "Keep practicing! I need a few more mistakes to analyze your weak points.",
            "tags": []
        }

    # 2. Preparem el prompt pel Coach
    mistakes_text = "\n".join([f"- Type: {m['type']}, Q: {m['question']}, User said: {m['user_answer']}, Correct: {m['correct_answer']}" for m in mistakes[-10:]])
    
    prompt = f"""
    You are an expert Cambridge C1 Tutor. Analyze these recent student mistakes:
    {mistakes_text}

    1. Identify the top 3 linguistic weaknesses (e.g., "Inverted Conditionals", "Phrasal Verbs with 'UP'", "Prepositions").
    2. Give 1 short paragraph of specific advice.
    
    OUTPUT JSON:
    {{
        "weaknesses": ["Weakness 1", "Weakness 2", "Weakness 3"],
        "advice": "Your advice here..."
    }}
    """

    # 3. Cridem a l'IA
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": prompt}],
        response_format={"type": "json_object"}
    )
    
    return json.loads(response.choices[0].message.content)