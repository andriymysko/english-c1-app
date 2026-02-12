from fastapi import APIRouter, HTTPException, Response, UploadFile, File, BackgroundTasks, Body, Request, Header
from fastapi.responses import FileResponse
from app.services.generators.factory import ExerciseFactory
from app.services.pdf.generator import generate_pdf_file
from app.services.db import DatabaseService
from app.services.generators.review import ReviewGenerator
from app.services.generators.vocabulary import VocabularyGenerator
from app.services.generators.exam import ExamGenerator
from app.services.grader import Grader
from app.services.audio import AudioService
from app.services.storage import StorageService # 👈 IMPORT DEL SERVEI D'EMMAGATZEMATGE
from pydantic import BaseModel
from typing import Optional, List, Any
from collections import Counter
import os
import tempfile
import base64
from openai import OpenAI
import json
from datetime import datetime
from firebase_admin import firestore
import stripe
import time

router = APIRouter()

# Inicialitzem client DB localment per gestionar els comptadors
db = firestore.client()

# --- CONFIGURACIÓ STRIPE ---
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# --- MODELS DE DADES ---

class ExerciseRequest(BaseModel):
    user_id: str
    level: str = "C1"
    exercise_type: str
    completed_ids: List[str] = []
    topic: Optional[str] = None
    instructions: Optional[str] = None

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

class CheckoutRequest(BaseModel):
    price_id: str
    user_id: str

# --- FALLBACK DATA ---
FALLBACK_SPEAKING_1 = {
    "text": "1. What do you think is the key to a happy life?\n2. Do you prefer planning your future or living in the moment?\n3. How important is it to have a creative hobby?",
    "topic": "Life & Happiness (Backup Mode)"
}

FALLBACK_SPEAKING_2 = {
    "text": "[IMAGES]\n1. A busy open-plan office\n2. A person working alone in a quiet library\n3. A construction site team\n\n[CANDIDATE A - INSTRUCTION]\nLook at the pictures. They show people working in different environments. I’d like you to compare two of the pictures and say why people might choose to work in these places, and what challenges they might face.\n\n[CANDIDATE B - SHORT RESPONSE]\nWhich of these places would you prefer to work in?",
    "image_url": "https://firebasestorage.googleapis.com/v0/b/english-c1-app.firebasestorage.app/o/speaking_part2%2Ffallback_office.png?alt=media",
    "topic": "Work Environments (Backup Mode)"
}

# --- HELPER FUNCTION (AMB LÒGICA D'IMATGES ROBUSTA) ---
def generate_and_save_exercise(level: str, exercise_type: str, is_public: bool = True):
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

        # 3. 🔴 GESTIÓ D'IMATGES FORÇADA (Speaking Part 2)
        # Si és Speaking 2, ens assegurem que tingui imatge sí o sí.
        if exercise_type == "speaking2":
            client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            
            # A. Si l'exercici NO té imatge (perquè la factory no l'ha fet), la fem ara
            if not exercise_data.get('image_url'):
                print("🎨 BACKGROUND: L'exercici no portava imatge. Generant-ne una amb DALL-E ara mateix...")
                try:
                    # Traiem el prefix del títol per tenir un prompt net
                    topic = exercise_data.get('title', 'General Topic').replace("Speaking Part 2: ", "")
                    
                    # Utilitzem el prompt "Wide" per obtenir els 3 panells
                    image_prompt = f"Wide image split into 3 distinct vertical panels side-by-side. Panel 1: A scene showing {topic} situation A. Panel 2: A scene showing {topic} situation B. Panel 3: A scene showing {topic} situation C. Photorealistic style, educational."
                    
                    # Nota: DALL-E 3 standard sempre és 1024x1024, però el prompt ajuda a l'estructura.
                    # Si vols format wide real, caldria size="1792x1024" (costa igual), però comprovem que funcioni primer.
                    img_resp = client.images.generate(model="dall-e-3", prompt=image_prompt, n=1, size="1024x1024")
                    
                    # Assignem la URL temporal a les dades
                    exercise_data['image_url'] = img_resp.data[0].url
                except Exception as e:
                    print(f"⚠️ Error generant imatge DALL-E al background: {e}")

            # B. Si ara JA tenim URL (sigui nova o vella), la pujem a Firebase
            # Comprovem que no sigui ja de firebase per no pujar-la dos cops
            if exercise_data.get('image_url') and "firebasestorage" not in exercise_data['image_url']:
                print(f"💾 BACKGROUND: Convertint URL temporal a Permanent a Firebase...")
                try:
                    perm_url = StorageService.save_image_from_url(exercise_data['image_url'], folder="speaking_part2")
                    exercise_data['image_url'] = perm_url
                    print(f"✅ Imatge guardada permanentment a l'objecte: {perm_url}")
                except Exception as e:
                    print(f"⚠️ Error pujant a Storage: {e}")

        # 4. Guardar a Firestore
        doc_id = DatabaseService.save_exercise(exercise_data, level, exercise_type, is_public=is_public)
        print(f"✅ BACKGROUND: Exercici guardat correctament a la DB! ID: {doc_id}")
        return exercise_data

    except Exception as e:
        print(f"❌ BACKGROUND ERROR CRÍTIC: {e}")
        return None

# --- ENDPOINTS ---

@router.post("/generate")
def generate_exercise_endpoint(request: GenerateRequest):
    
    # =================================================================
    # 🧠 SPEAKING PART 1: INTERVIEW
    # =================================================================
    if request.type == "speaking1":
        try:
            client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
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
            print(f"⚠️ OPENAI ERROR (SP1): {e}")
            return {
                "id": f"speaking1_fallback_{int(time.time())}",
                "type": "speaking",
                "title": f"Speaking Part 1: {FALLBACK_SPEAKING_1['topic']}",
                "instruction": "Answer the questions briefly but fully.",
                "text": FALLBACK_SPEAKING_1["text"],
                "level": request.level
            }

    # =================================================================
    # 🧠 SPEAKING PART 2 (AMB ESTRUCTURA RIGIDA)
    # =================================================================
    elif request.type == "speaking2":
        try:
            client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            topic_str = request.topic if request.topic else "Risk & Achievement"
            
            prompt = f"""
            Generate a Cambridge C1 Advanced Speaking Part 2 task based on the topic: '{topic_str}'.

            CRITICAL FORMATTING RULES (DO NOT DEVIATE):
            1. **Candidate A Instructions**: 
               - MUST explicitly state: "I’d like you to compare **two** of the pictures".
               - MUST contain TWO questions linked by "and". 
               - Structure: "...say [Question 1 (speculative)], and [Question 2 (emotional/consequential)]."
            
            2. **Candidate B Question**:
               - MUST be a short "Which..." question.
               - Example: "Which situation do you think is the most difficult?"

            3. **Images**: Describe 3 distinct visual situations.

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

            # Imatge
            # Utilitzem el prompt "Wide" i size="1792x1024" per millorar la composició
            image_prompt = f"Wide image split into 3 distinct vertical panels side-by-side. Panel 1: A scene showing {topic_str} situation A. Panel 2: A scene showing {topic_str} situation B. Panel 3: A scene showing {topic_str} situation C. Photorealistic style, educational."
            print("🎨 Generant imatges amb DALL-E 3 (Wide)...")
            
            img_response = client.images.generate(
                model="dall-e-3",
                prompt=image_prompt,
                n=1,
                size="1792x1024" # Format panoràmic
            )
            temp_url = img_response.data[0].url

            # Guardar (Safe Mode)
            try:
                permanent_url = StorageService.save_image_from_url(temp_url, folder="speaking_part2")
            except Exception as img_err:
                print(f"⚠️ Storage Error: {img_err}")
                permanent_url = temp_url 

            return {
                "id": f"speaking2_{int(time.time())}",
                "type": "speaking",
                "title": f"Speaking Part 2: {topic_str}",
                "instruction": "Compare TWO pictures and answer both questions.",
                "text": ai_text,
                "image_url": permanent_url,
                "level": request.level
            }

        except Exception as e:
            print(f"⚠️ OPENAI ERROR (SP2): {e}")
            return {
                "id": f"speaking2_fallback_{int(time.time())}",
                "type": "speaking",
                "title": f"Speaking Part 2: {FALLBACK_SPEAKING_2['topic']}",
                "instruction": "Compare TWO pictures and answer both questions.",
                "text": FALLBACK_SPEAKING_2["text"],
                "image_url": "", 
                "level": request.level
            }

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
        
        # --- LÒGICA DEL COMPTADOR DIARI ---
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

        # ----------------------------------------
        existing = DatabaseService.get_existing_exercise(request.level, request.exercise_type, request.completed_ids)
        
        if existing:
            background_tasks.add_task(generate_and_save_exercise, request.level, request.exercise_type)
            final_exercise = existing
        else:
            final_exercise = generate_and_save_exercise(request.level, request.exercise_type, is_public=True)
            if not final_exercise:
                raise HTTPException(status_code=503, detail="Service currently unavailable.")

        if not is_vip:
            usage_data["counts"][ex_type] = current_count + 1
            user_ref.set({"daily_usage": usage_data}, merge=True)

        return final_exercise

    except HTTPException as he: raise he
    except Exception as e:
        print(f"ERROR CRÍTIC: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
def submit_result(result: UserResult):
    try:
        simulated_exercise_data = {
            "id": result.exercise_id,
            "type": result.exercise_type
        }
        gamification = DatabaseService.save_user_result(
            result.user_id, simulated_exercise_data, result.score, result.total, result.mistakes
        )
        return {"status": "saved", "gamification": gamification}
    except Exception as e:
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
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.chat.completions.create(model="gpt-4o", messages=[{"role": "system", "content": prompt}], response_format={"type": "json_object"})
    return json.loads(response.choices[0].message.content)

@router.post("/ad_reward/")
def ad_reward(request: AdRewardRequest):
    DatabaseService.reward_ad_view(request.user_id)
    return {"status": "rewarded"}

# ... STRIPE ...
@router.post("/create-checkout-session")
def create_checkout_session(request: CheckoutRequest):
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{'price': request.price_id, 'quantity': 1}],
            mode='subscription',
            automatic_tax={'enabled': True},
            allow_promotion_codes=True, 
            success_url='https://getaidvanced.com/profile?success=true',
            cancel_url='https://getaidvanced.com/pricing?canceled=true',
            client_reference_id=request.user_id,
            metadata={"user_id": request.user_id}
        )
        return {"url": session.url}
    except Exception as e:
        print(f"Error Stripe Checkout: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stripe-webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    payload = await request.body()
    endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, endpoint_secret)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid payload/signature")
    
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        user_id = session.get("client_reference_id")
        subscription_id = session.get("subscription")
        if user_id:
            db.collection("users").document(user_id).update({
                "is_vip": True, "subscription_status": "active", "subscription_id": subscription_id, "updated_at": datetime.now()
            })
    elif event['type'] in ['customer.subscription.deleted', 'customer.subscription.updated']:
        subscription = event['data']['object']
        status = subscription.get('status')
        if event['type'] == 'customer.subscription.deleted' or status in ['past_due', 'canceled', 'unpaid']:
            users_ref = db.collection("users")
            query = users_ref.where("subscription_id", "==", subscription.get('id')).stream()
            for doc in query:
                doc.reference.update({"is_vip": False, "subscription_status": "inactive"})
    return {"status": "success"}