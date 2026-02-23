from fastapi import APIRouter, HTTPException, Response, UploadFile, File, BackgroundTasks, Body, Request, Header
from fastapi.responses import FileResponse
from app.services.generators.factory import ExerciseFactory
from app.services.pdf.generator import generate_pdf_file
from app.services.db import DatabaseService
from app.services.generators.review import ReviewGenerator
from app.services.generators.vocabulary import VocabularyGenerator
from app.services.generators.exam import ExamGenerator
from app.services.grader import CorrectionService
from app.services.audio import AudioService
from app.services.storage import StorageService 
from pydantic import BaseModel
from typing import Optional, List, Any
from collections import Counter
import os
from app.core.config import settings
import tempfile
import base64
from openai import OpenAI
import json
from datetime import datetime
from firebase_admin import firestore
import time
import random
from pydantic import BaseModel
from typing import List, Optional, Dict, Any




router = APIRouter()

# Inicialitzem client DB localment per gestionar els comptadors
from app.services.db import db

# --- MODELS DE DADES ---

class ExerciseRequest(BaseModel):
    user_id: str
    level: str = "C1"
    exercise_type: str
    completed_ids: List[str] = []
    topic: Optional[str] = None
    instructions: Optional[str] = None

class SubmitResultRequest(BaseModel):
    user_id: str
    exercise_type: str
    score: int
    total: Optional[int] = None
    mistakes: Optional[List[Dict[str, Any]]] = []

class GenerateRequest(BaseModel):
    type: str
    level: str = "C1"
    topic: Optional[str] = None
    instructions: Optional[str] = None

class WritingSubmission(BaseModel):
    user_id: str
    task_text: str
    user_text: str
    level: str = "C1"

class UserResult(BaseModel):
    user_id: str
    exercise_type: str              
    exercise_id: Optional[str] = None 
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

class AdRewardRequest(BaseModel):
    user_id: str

# --- FALLBACK DATA (PER SI TOT FALLA) ---
FALLBACK_SPEAKING_2 = {
    "text": "[IMAGES]\n1. A busy open-plan office\n2. A person working alone in a quiet library\n3. A construction site team\n\n[CANDIDATE A - INSTRUCTION]\nLook at the pictures. They show people working in different environments. I’d like you to compare two of the pictures and say why people might choose to work in these places, and what challenges they might face.\n\n[CANDIDATE B - SHORT RESPONSE]\nWhich of these places would you prefer to work in?",
    "image_urls": [
        "https://firebasestorage.googleapis.com/v0/b/english-c1-app.firebasestorage.app/o/fallback%2Foffice1.png?alt=media",
        "https://firebasestorage.googleapis.com/v0/b/english-c1-app.firebasestorage.app/o/fallback%2Foffice2.png?alt=media",
        "https://firebasestorage.googleapis.com/v0/b/english-c1-app.firebasestorage.app/o/fallback%2Foffice3.png?alt=media"
    ],
    "topic": "Work Environments (Backup Mode)"
}

# --- HELPER FUNCTION (AMB GENERACIÓ DE 3 IMATGES) ---
def generate_and_save_exercise(level: str, exercise_type: str, is_public: bool = True, weak_words: list = None):
    print(f"⚙️ BACKGROUND: Iniciant generació per {exercise_type}...")
    try:
        # 1. Generem el text base (Factory)
        exercise_object = ExerciseFactory.create_exercise(exercise_type, level)
        exercise_data = exercise_object.model_dump()
        
        # 2. Gestió d'Àudio (Listening)
        if exercise_type.startswith("listening"):
            try:
                audio_bytes = AudioService.generate_audio(exercise_data['text'])
                audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
                exercise_data['audio_base64'] = audio_base64
            except Exception as e:
                print(f"⚠️ Error generant àudio inicial: {e}")

        # 3. 🔴 GESTIÓ D'IMATGES FORÇADA (Speaking Part 2 - 3 IMATGES)
        # Si és Speaking 2, generem 3 imatges d'alta qualitat.
        if exercise_type == "speaking2":
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            topic = exercise_data.get('title', 'General Topic').replace("Speaking Part 2: ", "")
            
            # Assegurem que tenim una llista per guardar les URLs
            if 'image_urls' not in exercise_data or not exercise_data['image_urls']:
                exercise_data['image_urls'] = []

            # A. Generar les 3 imatges si no n'hi ha
            if len(exercise_data['image_urls']) < 3:
                print(f"🎨 BACKGROUND: Generant 3 imatges separades d'alta qualitat per al tema '{topic}'...")
                temp_urls = []
                
                # Variacions per als prompts per assegurar que les 3 fotos siguin diferents
                variations = ["focusing on an individual scenario", "showing a group interaction", "depicting a contrasting situation or outcome"]
                
                for i in range(3):
                    try:
                        variation = variations[i] if i < len(variations) else "different perspective"
                        image_prompt = f"A photorealistic, candid photograph showing a scene related to '{topic}', {variation}. Educational context, high detail. Image {i+1} of 3."
                        
                        print(f"   ▶️ Generant imatge {i+1}/3...")
                        img_resp = client.images.generate(model="dall-e-3", prompt=image_prompt, n=1, size="1024x1024")
                        temp_urls.append(img_resp.data[0].url)
                    except Exception as e:
                         print(f"⚠️ Error generant la imatge {i+1}: {e}")
                
                # Afegim les temporals a la llista
                exercise_data['image_urls'].extend(temp_urls)

            # B. Pujar les URLs temporals a Firebase Storage
            final_urls = []
            print("💾 BACKGROUND: Pujant imatges a Firebase Storage...")
            for i, url in enumerate(exercise_data.get('image_urls', [])):
                if "firebasestorage" not in url and "oai" in url: # Si és d'OpenAI
                     try:
                         print(f"   ▶️ Pujant imatge {i+1}...")
                         perm_url = StorageService.save_image_from_url(url, folder="speaking_part2")
                         final_urls.append(perm_url)
                     except Exception as e:
                         print(f"   ⚠️ Error pujant imatge {i+1}: {e}")
                         # Si falla, intentem mantenir la temporal encara que caduqui
                         final_urls.append(url)
                else:
                    # Ja és permanent o no és vàlida
                    final_urls.append(url)
            
            # Actualitzem la llista definitiva
            exercise_data['image_urls'] = final_urls
            # Eliminem el camp singular antic per evitar confusions
            if 'image_url' in exercise_data: del exercise_data['image_url']

        # 4. Guardar a Firestore
        doc_id = DatabaseService.save_exercise(exercise_data, is_public=is_public)
        print(f"✅ BACKGROUND: Exercici guardat correctament a la DB! ID: {doc_id}")
        return exercise_data

    except Exception as e:
        print(f"❌ BACKGROUND ERROR CRÍTIC: {e}")
        return None

# --- ENDPOINTS ---

@router.post("/generate")
def generate_exercise_endpoint(request: GenerateRequest):
    
    # =================================================================
    # 🧠 SPEAKING PART 1
    # =================================================================
    if request.type == "speaking1":
        # ... (Codi de Speaking 1 igual que abans) ...
        try:
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            topic_str = request.topic if request.topic else "General Life"
            extra_instr = f"Note: {request.instructions}" if request.instructions else ""

            prompt = f"""
            Generate 3 distinct Speaking Part 1 interview questions for a Cambridge C1 Advanced exam based on the topic: '{topic_str}'.
            CRITICAL: Questions must be PERSONAL ("you"). No abstract concepts.
            Output ONLY the 3 questions, numbered 1, 2, 3.
            {extra_instr}
            """

            response = client.chat.completions.create(
                model="gpt-4o", 
                messages=[{"role": "system", "content": "You are a Cambridge C1 exam expert."}, {"role": "user", "content": prompt}]
            )
            ai_text = response.choices[0].message.content.strip()

            return {
                "id": f"speaking1_{int(time.time())}",
                "type": "speaking",
                "title": f"Speaking Part 1: {topic_str}",
                "instruction": "Answer the questions briefly but fully about YOURSELF (20-30 seconds per answer).",
                "text": ai_text,
                "level": request.level
            }
        except Exception as e:
             print(f"⚠️ Error SP1: {e}")
             raise HTTPException(status_code=500, detail=str(e))


    # =================================================================
    # 🧠 SPEAKING PART 2 (GENERACIÓ SÍNCRONA - 3 IMATGES)
    # =================================================================
    elif request.type == "speaking2":
        try:
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            topic_str = request.topic if request.topic else "Risk & Achievement"
            
            # 1. GENERAR TEXT
            prompt = f"""
            Generate a Cambridge C1 Advanced Speaking Part 2 task based on the topic: '{topic_str}'.

            CRITICAL FORMATTING RULES (DO NOT DEVIATE):
            1. **Candidate A Instructions**: 
               - MUST explicitly state: "I’d like you to compare **two** of the pictures".
               - MUST contain TWO questions linked by "and". 
            2. **Candidate B Question**:
               - MUST be a short "Which..." question.

            OUTPUT FORMAT (Plain Text Only):
            [IMAGES]
            1. ...
            2. ...
            3. ...

            [CANDIDATE A - INSTRUCTION]
            Look at the pictures. They show people [context]. I’d like you to compare two of the pictures and say [Question 1], and [Question 2].

            [CANDIDATE B - SHORT RESPONSE]
            [Question starting with 'Which...']
            """

            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "system", "content": "You are a Cambridge C1 exam expert. Follow formatting strictly."}, {"role": "user", "content": prompt}]
            )
            ai_text = response.choices[0].message.content.strip()

            # 2. GENERAR 3 IMATGES (Qualitat C1)
            print(f"🎨 FOREGROUND: Generant 3 imatges d'alta qualitat per '{topic_str}'...")
            final_urls = []
            variations = ["individual focus", "group interaction", "contrasting perspective"]
            
            for i in range(3):
                try:
                    variation = variations[i]
                    image_prompt = f"A photorealistic, candid photograph showing a scene related to '{topic_str}', {variation}. Educational context. Image {i+1}/3."
                    print(f"   ▶️ Generant imatge {i+1}/3...")
                    img_resp = client.images.generate(model="dall-e-3", prompt=image_prompt, n=1, size="1024x1024")
                    temp_url = img_resp.data[0].url
                    
                    # Guardar a Storage immediatament
                    print(f"   💾 Pujant imatge {i+1} a Storage...")
                    perm_url = StorageService.save_image_from_url(temp_url, folder="speaking_part2")
                    final_urls.append(perm_url)
                except Exception as e:
                    print(f"⚠️ Error en imatge {i+1}: {e}")
                    # Si falla una, intentem seguir. Si no n'hi ha cap, saltarà l'error general.

            if not final_urls:
                 raise Exception("Failed to generate any images.")

            return {
                "id": f"speaking2_{int(time.time())}",
                "type": "speaking",
                "title": f"Speaking Part 2: {topic_str}",
                "instruction": "Compare TWO pictures and answer both questions.",
                "text": ai_text,
                "image_urls": final_urls, # 👈 Retornem la llista de 3 URLs
                "level": request.level
            }

        except Exception as e:
            print(f"⚠️ ERROR CRÍTIC (SP2): {e}")
            # Retornem fallback si falla tot
            fallback = FALLBACK_SPEAKING_2.copy()
            fallback["id"] = f"speaking2_fallback_{int(time.time())}"
            fallback["level"] = request.level
            return fallback

    # =================================================================
    # 🔄 GENERACIÓ STANDARD
    # =================================================================
    try:
        exercise = ExerciseFactory.create_exercise(request.type, request.level)
        return exercise.model_dump() 
    except Exception as e:
        print(f"Error generating exercise: {e}") 
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/get_exercise/")
def get_exercise_data(request: ExerciseRequest, background_tasks: BackgroundTasks):
    try:
        user_id = request.user_id
        ex_type = request.exercise_type
        
        # --- 1. LLEGIR DADES I COMPROVAR LÍMITS ---
        user_ref = db.collection("users").document(user_id)
        user_doc = user_ref.get()
        user_data = user_doc.to_dict() if user_doc.exists else {}
        is_vip = user_data.get("is_vip", False)
        usage_data = user_data.get("daily_usage", {})
        
        today_str = datetime.now().strftime("%Y-%m-%d")
        if usage_data.get("date") != today_str:
            usage_data = {"date": today_str, "counts": {}}
            
        current_count = usage_data.get("counts", {}).get(ex_type, 0)
        
        if not is_vip and current_count >= 3:
            raise HTTPException(status_code=429, detail="DAILY_LIMIT")

        # --- 2. ACTUALITZAR COMPTADOR IMMEDIATAMENT ---
        if not is_vip:
            usage_data["counts"][ex_type] = current_count + 1
            user_ref.set({"daily_usage": usage_data}, merge=True)

        # --- 3. BUSCAR O GENERAR L'EXERCICI ---
        existing = DatabaseService.get_existing_exercise(request.level, request.exercise_type, request.completed_ids)
        
        if existing:
            print("✨ REUTILITZANT EXERCICI DB")
            background_tasks.add_task(generate_and_save_exercise, request.level, request.exercise_type)
            final_exercise = existing
        else:
            print("⚠️ POOL BUIDA. Generant on-demand...")
            
            # 🔥 NOU: BUSQUEM ELS PUNTS FEBLES DE L'USUARI
            weak_words = []
            if ex_type in ["reading_and_use_of_language1", "reading_and_use_of_language4"]:
                try:
                    vocab_ref = db.collection("users").document(user_id).collection("vocabulary")
                    # Agafem les 3 paraules amb més errors
                    weak_docs = vocab_ref.order_by("mistakes", direction=firestore.Query.DESCENDING).limit(3).stream()
                    weak_words = [doc.to_dict().get("word") for doc in weak_docs]
                    if weak_words:
                        print(f"🎯 Injectant punts febles al Prompt: {weak_words}")
                except Exception as e:
                    print(f"Error llegint vocabulari feble: {e}")

            # Li passem les weak_words a la funció de generar (que modificarem al Pas 3)
            final_exercise = generate_and_save_exercise(request.level, request.exercise_type, is_public=True, weak_words=weak_words)

        # --- 4. NETEJAR EL SENTINEL DE FIREBASE ---
        # (Aquí va la neteja, un cop final_exercise ja té l'exercici a dins!)
        if isinstance(final_exercise, dict):
            final_exercise = {k: v for k, v in final_exercise.items() if type(v).__name__ != 'Sentinel'}

        # --- 5. RETORNAR AL FRONTEND ---
        return final_exercise

    except HTTPException as he: 
        raise he
    except Exception as e:
        print(f"ERROR CRÍTIC: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ... (LA RESTA D'ENDPOINTS: preload, submit, stripe, etc. ES MANTENEN IGUAL) ...
@router.post("/preload_exercise/")
def preload_exercise(request: ExerciseRequest):
    try:
        existing = DatabaseService.get_existing_exercise(
            request.level, 
            request.exercise_type, 
            request.completed_ids
        )
        if existing:
            return {"status": "buffered"}

        print("⚡ BACKGROUND: Buffer buit! Generant exercici complet...")
        generate_and_save_exercise(request.level, request.exercise_type, is_public=True)
        return {"status": "generated"}

    except Exception as e:
        print(f"⚠️ Background Error: {e}")
        return {"status": "error"}

@router.post("/submit_result/")
def submit_exercise_result(result: SubmitResultRequest):
    try:
        # 1. Guardar l'estadística general (el que ja feies)
        user_ref = db.collection("users").document(result.user_id)
        user_ref.set({
            "total_score": firestore.Increment(result.score),
            "exercises_completed": firestore.Increment(1)
        }, merge=True)
        
        # 🔥 2. NOU: REGISTRAR ELS ERRORS (Només per Use of English)
        if result.exercise_type in ["reading_and_use_of_language1", "reading_and_use_of_language4"]:
            if result.mistakes:
                vocab_ref = user_ref.collection("vocabulary")
                
                for mistake in result.mistakes:
                    # Agafem la resposta correcta (el phrasal verb o paraula)
                    word = mistake.get("correct_answer", "").strip().lower()
                    if not word:
                        continue
                        
                    # Fem servir la paraula com a ID del document (traient espais rars)
                    doc_id = word.replace(" ", "_").replace("/", "_")
                    word_doc = vocab_ref.document(doc_id)
                    
                    doc_snap = word_doc.get()
                    if doc_snap.exists:
                        # Si ja existeix, sumem un error
                        word_doc.update({"mistakes": firestore.Increment(1)})
                    else:
                        # Si és el primer cop que la falla, la creem
                        word_doc.set({
                            "word": word,
                            "mistakes": 1,
                            "added_at": firestore.SERVER_TIMESTAMP
                        })

        return {"status": "success"}
    except Exception as e:
        print(f"Error a submit_result: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate_full_exam/")
def generate_full_exam(request: ExamRequest):
    try:
        if not DatabaseService.check_user_quota(request.user_id, cost=5):
             raise HTTPException(status_code=429, detail="Daily limit reached.")
        return ExamGenerator.generate_full_exam(request.user_id, request.level)
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
    ex['id'] = DatabaseService.save_exercise(ex, is_public=False)
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
    return CorrectionService.grade_writing(request.user_text, request.task_text, request.level)

@router.post("/grade_speaking/")
def grade_speaking(request: WritingSubmission):
    return CorrectionService.grade_speaking(request.user_text, request.task_text, request.level)

@router.post("/transcribe_audio/")
def transcribe_audio(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(file.file.read())
        path = tmp.name
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    with open(path, "rb") as f:
        t = client.audio.transcriptions.create(model="whisper-1", file=f)
    os.unlink(path)
    return {"text": t.text}

@router.post("/generate_audio/")
def generate_audio_endpoint(request: AudioRequest):
    b = AudioService.generate_audio(request.text)
    return Response(content=b, media_type="audio/mpeg")

@router.post("/download_pdf")
async def download_pdf(exercise_data: dict = Body(...)):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp_path = tmp.name
        generate_pdf_file(exercise_data, tmp_path)
        return FileResponse(tmp_path, filename="PrepAI_Exercise.pdf", media_type='application/pdf')
    except Exception as e:
        print(f"Error generating PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
    stats = DatabaseService.get_user_stats(user_id)
    mistakes = stats.get("mistakes_pool", [])
    if len(mistakes) < 3:
        return {"analysis": "Keep practicing! I need a few more mistakes to analyze your weak points.", "tags": []}
    mistakes_text = "\n".join([f"- Type: {m['type']}, Q: {m['question']}, User said: {m['user_answer']}, Correct: {m['correct_answer']}" for m in mistakes[-10:]])
    prompt = f"""You are an expert Cambridge C1 Tutor. Analyze these recent student mistakes:\n{mistakes_text}\n1. Identify the top 3 linguistic weaknesses.\n2. Give 1 short paragraph of advice.\nOUTPUT JSON: {{ "weaknesses": [...], "advice": "..." }}"""
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.chat.completions.create(model="gpt-4o", messages=[{"role": "system", "content": prompt}], response_format={"type": "json_object"})
    return json.loads(response.choices[0].message.content)

@router.post("/ad_reward/")
def ad_reward(request: AdRewardRequest):
    DatabaseService.reward_ad_view(request.user_id)
    return {"status": "rewarded"}

@router.get("/vocabulary/{user_id}")
def get_user_vocabulary(user_id: str):
    try:
        # Anem a la col·lecció de l'usuari i ordenem de més a menys errors
        vocab_ref = db.collection("users").document(user_id).collection("vocabulary")
        docs = vocab_ref.order_by("mistakes", direction=firestore.Query.DESCENDING).stream()
        
        vocab_list = []
        for doc in docs:
            data = doc.to_dict()
            vocab_list.append({
                "word": data.get("word", ""),
                "mistakes": data.get("mistakes", 0),
                # Firebase retorna un objecte Datetime, el passem a string
                "added_at": data.get("added_at").isoformat() if data.get("added_at") else None
            })
            
        return {"vocabulary": vocab_list}
    except Exception as e:
        print(f"Error llegint vocabulari: {e}")
        raise HTTPException(status_code=500, detail=str(e))