from firebase_admin import firestore
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import random

load_dotenv()

# 🔥 Ja no inicialitzem firebase_admin aquí. Assumim que main.py ja ho ha fet.
db = firestore.client()

class DatabaseService:
    
    # ==========================================
    # 1. GESTIÓ D'EXERCICIS (CORE)
    # ==========================================

    @staticmethod
    def save_exercise(exercise_data: dict, is_public: bool = True):
        try:
            # 1. Netegem l'ID si ja en té un per no duplicar-lo
            if "id" in exercise_data:
                del exercise_data["id"]
                
            # 🔥 2. ELIMINEM L'ÀUDIO BASE64 PER EVITAR EL LÍMIT D'1MB DE FIREBASE
            if "audio_base64" in exercise_data:
                del exercise_data["audio_base64"]
                
            # 3. Afegim el camp públic
            exercise_data["is_public"] = is_public
            
            # 4. Guardem a la col·lecció
            doc_ref = db.collection("exercises").document()
            doc_ref.set(exercise_data)
            
            print(f"✅ BACKGROUND: Exercici guardat correctament a la DB! ID: {doc_ref.id}")
            return doc_ref.id
            
        except Exception as e:
            print(f"❌ ERROR CRÍTIC GUARDANT A FIREBASE: {e}")
            return None

    @staticmethod
    def get_existing_exercise(level: str, exercise_type: str, completed_ids: list):
        """
        Busca a Firestore un exercici d'un nivell i tipus específic 
        que l'usuari encara no hagi completat (Cache Hit).
        """
        try:
            # 1. Busquem tots els exercicis d'aquest tipus i nivell
            docs = db.collection("exercises")\
                     .where("level", "==", level)\
                     .where("type", "==", exercise_type)\
                     .stream()
            
            available_exercises = []
            
            # 2. Filtrem els que l'usuari ja ha fet
            for doc in docs:
                if doc.id not in completed_ids:
                    ex_data = doc.to_dict()
                    ex_data["id"] = doc.id
                    available_exercises.append(ex_data)
            
            # 3. Si en tenim de disponibles, en retornem un a l'atzar
            if available_exercises:
                import random
                selected = random.choice(available_exercises)
                print(f"✅ CACHE HIT: Trobat exercici {selected['id']} a la Pool.")
                return selected
                
            # Si tots estan fets o no n'hi ha cap (Cache Miss)
            print("⚠️ CACHE MISS: Cap exercici disponible a la Pool. Generant...")
            return None
            
        except Exception as e:
            print(f"❌ Error a get_existing_exercise: {e}")
            return None

    @staticmethod
    def get_random_exercise(exercise_type: str, level: str = "C1"):
        """Busca un exercici aleatori a la BD que coincideixi amb tipus i nivell"""
        try:
            exercises_ref = db.collection("exercises")
            query = exercises_ref.where("type", "==", exercise_type)\
                                 .where("level", "==", level)\
                                 .where("is_flagged", "==", False)\
                                 .limit(20)
            
            docs = query.get()
            exercises = []
            for doc in docs:
                data = doc.to_dict()
                data["id"] = doc.id
                exercises.append(data)
            
            if not exercises:
                print(f"⚠️ Cap exercici trobat a la BD per a: {exercise_type}")
                return None
            
            selected = random.choice(exercises)
            print(f"🎲 Exercici recuperat de la BD: {selected.get('id')}")
            return selected
        except Exception as e:
            print(f"❌ Error a get_random_exercise: {e}")
            return None

    # ==========================================
    # 2. GESTIÓ DE VIP, CRÈDITS I ANUNCIS
    # ==========================================

    @staticmethod
    def grant_vip_access(user_id: str, days: int, correction_credits: int):
        """Dona accés VIP temporal i suma crèdits de correcció"""
        try:
            user_ref = db.collection('users').document(user_id)
            user_doc = user_ref.get()
            data = user_doc.to_dict() if user_doc.exists else {}

            current_expiry = data.get('vip_expiry')
            now = datetime.now()
            
            if current_expiry:
                current_expiry = current_expiry.replace(tzinfo=None) if hasattr(current_expiry, 'replace') else current_expiry
                new_expiry = (current_expiry if current_expiry > now else now) + timedelta(days=days)
            else:
                new_expiry = now + timedelta(days=days)

            user_ref.set({
                'is_vip': True,
                'vip_expiry': new_expiry,
                'correction_credits': (data.get('correction_credits', 0) + correction_credits)
            }, merge=True)
            
            return True
        except Exception as e:
            print(f"Error granting VIP: {e}")
            return False

    @staticmethod
    def add_credits_only(user_id: str, credits: int):
        try:
            user_ref = db.collection('users').document(user_id)
            user_ref.update({'correction_credits': firestore.Increment(credits)})
            return True
        except: return False

    @staticmethod
    def use_correction_credit(user_id: str) -> bool:
        try:
            user_ref = db.collection('users').document(user_id)
            @firestore.transactional
            def consume_credit(transaction, ref):
                snapshot = transaction.get(ref)
                if not snapshot.exists: return False
                credits = snapshot.get('correction_credits') or 0
                if credits > 0:
                    transaction.update(ref, {'correction_credits': credits - 1})
                    return True
                return False
            return consume_credit(db.transaction(), user_ref)
        except: return False

    @staticmethod
    def reward_ad_view(user_id: str):
        try:
            user_ref = db.collection('users').document(user_id)
            user_doc = user_ref.get()
            if not user_doc.exists: return False
            
            data = user_doc.to_dict()
            ads_today = data.get('ads_watched_today', 0)
            if ads_today >= 3: return False
            
            batch = db.batch()
            batch.update(user_ref, {'daily_gen_count': firestore.Increment(-1)})
            batch.update(user_ref, {'ads_watched_today': firestore.Increment(1)})
            batch.commit()
            return True
        except: return False

    # ==========================================
    # 3. GAMIFICACIÓ I STATS
    # ==========================================

    @staticmethod
    def update_user_gamification(user_id: str, score: int):
        try:
            user_ref = db.collection('users').document(user_id)
            user_doc = user_ref.get()
            now = datetime.now()
            today_str = now.strftime('%Y-%m-%d')
            
            data = user_doc.to_dict() if user_doc.exists else {}
            current_xp = data.get('xp', 0)
            new_xp = current_xp + 10 + score
            
            user_ref.set({
                'last_active_date': today_str,
                'xp': new_xp,
                'level': int(new_xp / 500) + 1
            }, merge=True)
            return True
        except: return False

    @staticmethod
    def get_user_stats(user_id: str):
        try:
            u_doc = db.collection('users').document(user_id).get()
            if not u_doc.exists:
                return {
                    "xp": 0, "streak": 0, "level": 1, "is_vip": False, 
                    "exercises_completed": 0, "mistakes_pool": []
                }
            
            u_data = u_doc.to_dict()
            vip_expiry = u_data.get('vip_expiry')
            is_vip_active = False
            if vip_expiry:
                expiry_date = vip_expiry.replace(tzinfo=None) if hasattr(vip_expiry, 'replace') else vip_expiry
                is_vip_active = expiry_date > datetime.now()
                
            # Calculem la mitjana per al perfil de manera segura
            total_score = u_data.get('total_score', 0)
            completed = u_data.get('exercises_completed', 0)
            avg = round((total_score / (completed * 8)) * 100) if completed > 0 else 0

            return {
                "xp": u_data.get('xp', 0),
                "streak": u_data.get('streak', 0),
                "level": u_data.get('level', 1),
                "is_vip": is_vip_active,
                "correction_credits": u_data.get('correction_credits', 0),
                "daily_gen_count": u_data.get('daily_gen_count', 0),
                # 🔥 ELS NOUS CAMPS CRÍTICS PER AL PERFIL:
                "exercises_completed": completed,
                "average_score": min(avg, 100), # Limitem a 100%
                "mistakes_pool": u_data.get('mistakes_pool', []) 
            }
        except Exception as e:
            print(f"Error a get_user_stats: {e}")
            return None

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
        except: return None

    # ==========================================
    # 4. FLASHCARDS I REPORTS
    # ==========================================

    @staticmethod
    def save_generated_flashcards(user_id: str, new_cards: list):
        try:
            batch = db.batch()
            col = db.collection('users').document(user_id).collection('flashcards')
            for card in new_cards:
                card['priority'] = 50
                batch.set(col.document(), card)
            batch.commit()
            return True
        except: return False

    @staticmethod
    def report_issue(user_id: str, exercise_id: str, question_index: int, reason: str, exercise_data: dict):
        try:
            db.collection('reports').add({
                'user_id': user_id,
                'exercise_id': exercise_id,
                'question_index': question_index,
                'reason': reason,
                'exercise_type': exercise_data.get('type'),
                'timestamp': datetime.now(),
                'status': 'open'
            })
            return True
        except: return False

    @staticmethod
    def get_user_completed_ids(user_id: str) -> list:
        try:
            docs = db.collection("user_results").where("user_id", "==", user_id).stream()
            return [doc.to_dict().get('exercise_id') for doc in docs if doc.to_dict().get('exercise_id')]
        except: return []

    @staticmethod
    def save_enriched_vocabulary(user_id: str, enriched_words: list):
        """
        Guarda o actualitza el vocabulari enriquit a la subcol·lecció 'vocabulary' de l'usuari.
        S'espera format: [{"word": "...", "category": "...", "definition": "...", "example": "..."}]
        """
        try:
            vocab_ref = db.collection('users').document(user_id).collection('vocabulary')
            batch = db.batch()
            
            for item in enriched_words:
                if not item.get('word'):
                    continue
                    
                # 1. Creem un ID únic basat en la paraula per evitar duplicats (ex: "call off" -> "call_off")
                word_id = item['word'].lower().strip().replace(" ", "_").replace("/", "_")
                doc_ref = vocab_ref.document(word_id)
                
                # 2. Fem l'UPSERT amb 'merge=True' i Increment(1) per al comptador d'errors
                batch.set(doc_ref, {
                    "word": item['word'].lower().strip(),
                    "category": item.get('category', 'Vocabulary'),
                    "definition": item.get('definition', 'No definition provided.'),
                    "example": item.get('example', 'No example provided.'),
                    "mistakes": firestore.Increment(1),
                    "last_failed": datetime.now()
                }, merge=True)
                
            batch.commit()
            print(f"✅ Vocabulari enriquit guardat per a l'usuari {user_id}")
            return True
        except Exception as e:
            print(f"❌ Error guardant vocabulari enriquit: {e}")
            return False