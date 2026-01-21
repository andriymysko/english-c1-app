import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import random

load_dotenv()

# Inicialització de Firebase
if not firebase_admin._apps:
    try:
        cred_path = os.getenv("FIREBASE_CREDENTIALS")
        if not cred_path:
            if os.path.exists("serviceAccountKey.json"):
                cred_path = "serviceAccountKey.json"
            elif os.path.exists("app/serviceAccountKey.json"):
                cred_path = "app/serviceAccountKey.json"

        if cred_path and os.path.exists(cred_path):
            print(f"🔑 Carregant credencials Firebase des de: {cred_path}")
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            print(f"⚠️ ALERTA: Usant credencials per defecte.")
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred)     
    except Exception as e:
        print(f"⚠️ Error initializing Firebase: {e}")

db = firestore.client()

class DatabaseService:
    
    # --- RATE LIMITING (NOU) ---
    @staticmethod
    def check_user_quota(user_id: str, cost: int = 1, limit: int = 10) -> bool:
        """
        Retorna True si l'usuari pot generar. False si ha superat el límit diari.
        """
        if not user_id: return True # Si no hi ha ID, deixem passar (per tests)
        
        try:
            user_ref = db.collection('users').document(user_id)
            user_doc = user_ref.get()
            data = user_doc.to_dict() if user_doc.exists else {}
            
            today = datetime.now().strftime('%Y-%m-%d')
            last_date = data.get('last_gen_date', '')
            daily_count = data.get('daily_gen_count', 0)
            
            # Reset si és un nou dia
            if last_date != today:
                daily_count = 0
            
            # Comprovem límit
            if daily_count + cost > limit:
                print(f"🚫 QUOTA EXCEEDED: User {user_id} ({daily_count}/{limit})")
                return False
            
            # Si passem, incrementem i guardem
            user_ref.set({
                'last_gen_date': today,
                'daily_gen_count': daily_count + cost
            }, merge=True)
            
            return True
        except Exception as e:
            print(f"⚠️ Error checking quota: {e}")
            return True # Fail open: si falla la DB, deixem generar per no bloquejar

    # --- REPORTING ---
    @staticmethod
    def report_issue(user_id: str, exercise_id: str, question_index: int, reason: str, exercise_data: dict):
        try:
            # 1. Guardem el report individual (Això sempre ho fem)
            db.collection('reports').add({
                'user_id': user_id,
                'exercise_id': exercise_id,
                'question_index': question_index,
                'reason': reason,
                'exercise_type': exercise_data.get('type'),
                'timestamp': datetime.now(),
                'status': 'open'
            })
            
            # 2. LOGICA DE LLINDAR (THRESHOLD)
            if exercise_id:
                # Busquem quants reports té aquest exercici en total
                # (Podem filtrar també per question_index si volem ser molt precisos, 
                # però normalment si un exercici té 3 queixes en general, millor treure'l).
                reports_query = db.collection('reports').where('exercise_id', '==', exercise_id).stream()
                
                # Comptem els resultats
                total_reports = sum(1 for _ in reports_query)
                
                # DEFINIM EL MÍNIM DE PERSONES NECESSÀRIES
                MIN_REPORTS_TO_BAN = 3 
                
                print(f"🚩 Report rebut per {exercise_id}. Total acumulats: {total_reports}/{MIN_REPORTS_TO_BAN}")

                if total_reports >= MIN_REPORTS_TO_BAN:
                    print(f"🚫 Exercici {exercise_id} descartat automàticament (Massa reports).")
                    db.collection('exercises').document(exercise_id).update({'is_flagged': True})
                
            return True
        except Exception as e:
            print(f"Error reporting issue: {e}")
            return False

    # --- GAMIFICATION ---
    @staticmethod
    def update_user_gamification(user_id: str, score: int):
        try:
            user_ref = db.collection('users').document(user_id)
            user_doc = user_ref.get()
            now = datetime.now()
            today_str = now.strftime('%Y-%m-%d')
            yesterday_str = (now - timedelta(days=1)).strftime('%Y-%m-%d')
            
            data = user_doc.to_dict() if user_doc.exists else {}
            last_active = data.get('last_active_date', '')
            current_streak = data.get('streak', 0)
            
            if last_active == yesterday_str:
                current_streak += 1
            elif last_active != today_str:
                current_streak = 1 # Reset o inici
            
            current_xp = data.get('xp', 0)
            gained_xp = 10 + score
            new_xp = current_xp + gained_xp
            level = int(new_xp / 500) + 1
            
            user_ref.set({
                'last_active_date': today_str,
                'streak': current_streak,
                'xp': new_xp,
                'level': level
            }, merge=True)
            
            return {'streak': current_streak, 'level': level, 'xp': new_xp}
        except Exception:
            return None

    @staticmethod
    def get_user_stats(user_id: str):
        try:
            results_ref = db.collection('user_results').where('user_id', '==', user_id).stream()
            total_s, total_p, count = 0, 0, 0
            mistakes = []
            for doc in results_ref:
                d = doc.to_dict()
                s, t = int(d.get('score', 0)), int(d.get('total', 0))
                if t > 0:
                    total_s += min(s, t)
                    total_p += t
                    count += 1
                if 'mistakes' in d: mistakes.extend(d['mistakes'])
            
            avg = (total_s / total_p * 100) if total_p > 0 else 0
            
            # Get User Profile Data
            u_doc = db.collection('users').document(user_id).get()
            u_data = u_doc.to_dict() if u_doc.exists else {}
            
            return {
                "average_score": round(min(avg, 100.0), 1),
                "exercises_completed": count,
                "mistakes_pool": mistakes,
                "streak": u_data.get('streak', 0),
                "level": u_data.get('level', 1),
                "xp": u_data.get('xp', 0),
                "daily_gen_count": u_data.get('daily_gen_count', 0) # Per mostrar quota restant si vols
            }
        except Exception as e:
            return {"average_score": 0, "mistakes_pool": []}

    @staticmethod
    def save_user_result(user_id: str, exercise_data: dict, score: int, total: int, mistakes: list):
        try:
            db.collection('user_results').add({
                'user_id': user_id,
                'exercise_id': exercise_data.get('id'),
                'exercise_type': exercise_data.get('type'),
                'score': score,
                'total': total,
                'mistakes': mistakes,
                'timestamp': datetime.now()
            })
            return DatabaseService.update_user_gamification(user_id, score)
        except Exception:
            return None

    # --- CORE ---
    @staticmethod
    def save_exercise(exercise_data: dict, level: str, type_category: str, is_public: bool = True):
        try:
            exercise_data['created_at'] = datetime.now()
            exercise_data['level'] = level
            exercise_data['category'] = type_category
            exercise_data['is_public'] = is_public
            exercise_data['is_flagged'] = False 
            _, doc_ref = db.collection('exercises').add(exercise_data)
            return doc_ref.id
        except: return None
    
    @staticmethod
    def get_existing_exercise(level: str, exercise_type: str, completed_ids: list):
        try:
            # 1. Busquem una POOL d'exercicis (no només 1)
            # Agafem fins a 20 candidats per tenir varietat
            docs = db.collection('exercises')\
                .where('level', '==', level)\
                .where('type', '==', exercise_type)\
                .where('is_flagged', '==', False)\
                .limit(20)\
                .stream()
            
            # 2. Convertim a llista i filtrem els fets
            candidates = []
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                if doc.id not in completed_ids:
                    candidates.append(data)
            
            # 3. SELECCIÓ RANDOM
            if candidates:
                selected = random.choice(candidates) # <--- Màgia aquí
                print(f"🎲 Random Select: {selected['id']} from {len(candidates)} options.")
                return selected
            
            return None

        except Exception as e:
            print(f"Error fetching existing exercise: {e}")
            return None

    # --- FLASHCARDS ---
    @staticmethod
    def get_user_flashcards(user_id: str):
        try:
            docs = db.collection('users').document(user_id).collection('flashcards').order_by('priority', direction=firestore.Query.DESCENDING).limit(20).stream()
            return [{**doc.to_dict(), 'id': doc.id} for doc in docs]
        except: return []

    @staticmethod
    def save_generated_flashcards(user_id: str, new_cards: list):
        batch = db.batch()
        col = db.collection('users').document(user_id).collection('flashcards')
        for card in new_cards:
            card['priority'] = 50
            batch.set(col.document(), card)
        batch.commit()

    @staticmethod
    def update_flashcard_priority(user_id: str, card_id: str, success: bool):
        try:
            ref = db.collection('users').document(user_id).collection('flashcards').document(card_id)
            doc = ref.get()
            if not doc.exists: return
            curr = doc.to_dict().get('priority', 50)
            new_p = max(1, curr - 10) if success else min(100, curr + 20)
            ref.update({'priority': new_p})
        except: pass