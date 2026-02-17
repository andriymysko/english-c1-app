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
    
    # --- NOVES FUNCIONS DE GESTIÓ DE VIP I CRÈDITS (PAS 1) ---
    
    @staticmethod
    def grant_vip_access(user_id: str, days: int, correction_credits: int):
        """Dona accés VIP temporal i suma crèdits de correcció"""
        try:
            user_ref = db.collection('users').document(user_id)
            user_doc = user_ref.get()
            data = user_doc.to_dict() if user_doc.exists else {}

            # Calculem nova data d'expiració
            current_expiry = data.get('vip_expiry')
            now = datetime.now()
            
            # Si ja era VIP, sumem dies a la data actual. Si no, des d'avui.
            if current_expiry:
                # Gestió de dates segons si venen amb zona horària o no
                current_expiry = current_expiry.replace(tzinfo=None) if hasattr(current_expiry, 'replace') else current_expiry
                
                if current_expiry > now:
                    new_expiry = current_expiry + timedelta(days=days)
                else:
                    new_expiry = now + timedelta(days=days)
            else:
                new_expiry = now + timedelta(days=days)

            # Sumem crèdits als que ja tingués
            current_credits = data.get('correction_credits', 0)
            new_credits = current_credits + correction_credits

            user_ref.set({
                'is_vip': True, # Mantenen el flag per compatibilitat ràpida al frontend
                'vip_expiry': new_expiry,
                'correction_credits': new_credits
            }, merge=True)
            
            print(f"✅ User {user_id} upgraded: +{days} days, +{correction_credits} credits.")
            return True
        except Exception as e:
            print(f"Error granting VIP: {e}")
            return False

    @staticmethod
    def add_credits_only(user_id: str, credits: int):
        """Només afegeix crèdits de correcció (per packs sueltos)"""
        try:
            user_ref = db.collection('users').document(user_id)
            # Utilitzem 'increment' de firestore que és atòmic i segur
            user_ref.update({'correction_credits': firestore.Increment(credits)})
            return True
        except Exception as e:
            print(f"Error adding credits: {e}")
            return False

    @staticmethod
    def use_correction_credit(user_id: str) -> bool:
        """Intenta gastar un crèdit. Retorna True si ha pogut, False si no en té."""
        try:
            user_ref = db.collection('users').document(user_id)
            
            # Necessitem una transacció per assegurar que no baixi de 0
            @firestore.transactional
            def consume_credit(transaction, ref):
                snapshot = transaction.get(ref)
                if not snapshot.exists: return False
                credits = snapshot.get('correction_credits') or 0
                if credits > 0:
                    transaction.update(ref, {'correction_credits': credits - 1})
                    return True
                return False

            transaction = db.transaction()
            return consume_credit(transaction, user_ref)
        except Exception as e:
            print(f"Error using credit: {e}")
            return False

    @staticmethod
    def reward_ad_view(user_id: str):
        try:
            user_ref = db.collection('users').document(user_id)
            user_doc = user_ref.get()
            data = user_doc.to_dict()
            
            # 1. Comprovem quants anuncis ha vist avui
            ads_today = data.get('ads_watched_today', 0)
            
            # 2. POSEM EL LÍMIT AQUÍ (Exemple: Màxim 5 anuncis al dia)
            MAX_ADS = 3
            if ads_today >= MAX_ADS:
                return False # Li diem que no pot veure més
            
            # 3. Si està dins del límit, li donem la recompensa
            batch = db.batch()
            batch.update(user_ref, {'daily_gen_count': firestore.Increment(-1)})
            batch.update(user_ref, {'ads_watched_today': firestore.Increment(1)})
            batch.commit()
            
            return True
        except Exception:
            return False

    # --- RATE LIMITING ---
    @staticmethod
    def check_user_quota(user_id: str, cost: int = 1, limit: int = 10) -> bool:
        """
        Retorna True si l'usuari pot generar. False si ha superat el límit diari.
        Ara també comprova si el VIP ha caducat.
        """
        if not user_id: return True 
        
        try:
            user_ref = db.collection('users').document(user_id)
            user_doc = user_ref.get()
            data = user_doc.to_dict() if user_doc.exists else {}
            
            # 1. Comprovem VIP per Data (NOU)
            vip_expiry = data.get('vip_expiry')
            if vip_expiry:
                expiry_date = vip_expiry.replace(tzinfo=None) if hasattr(vip_expiry, 'replace') else vip_expiry
                if expiry_date > datetime.now():
                    return True # És VIP vigent -> Barra lliure

            # 2. Si no és VIP (o ha caducat), mirem quota diària
            today = datetime.now().strftime('%Y-%m-%d')
            last_date = data.get('last_gen_date', '')
            daily_count = data.get('daily_gen_count', 0)
            
            if last_date != today:
                daily_count = 0
            
            if daily_count + cost > limit:
                print(f"🚫 QUOTA EXCEEDED: User {user_id} ({daily_count}/{limit})")
                return False
            
            user_ref.set({
                'last_gen_date': today,
                'daily_gen_count': daily_count + cost
            }, merge=True)
            
            return True
        except Exception as e:
            print(f"⚠️ Error checking quota: {e}")
            return True 

    # --- REPORTING ---
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
            
            if exercise_id:
                reports_query = db.collection('reports').where('exercise_id', '==', exercise_id).stream()
                total_reports = sum(1 for _ in reports_query)
                MIN_REPORTS_TO_BAN = 3 
                
                print(f"🚩 Report rebut per {exercise_id}. Total acumulats: {total_reports}/{MIN_REPORTS_TO_BAN}")

                if total_reports >= MIN_REPORTS_TO_BAN:
                    print(f"🚫 Exercici {exercise_id} descartat automàticament.")
                    db.collection('exercises').document(exercise_id).update({'is_flagged': True})
                
            return True
        except Exception as e:
            print(f"Error reporting issue: {e}")
            return False

    # --- GAMIFICATION & STATS ---
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
                current_streak = 1 
            
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
            
            u_doc = db.collection('users').document(user_id).get()
            u_data = u_doc.to_dict() if u_doc.exists else {}
            
            # Comprovar si VIP segueix actiu
            is_vip_active = False
            vip_expiry = u_data.get('vip_expiry')
            if vip_expiry:
                expiry_date = vip_expiry.replace(tzinfo=None) if hasattr(vip_expiry, 'replace') else vip_expiry
                is_vip_active = expiry_date > datetime.now()

            return {
                "average_score": round(min(avg, 100.0), 1),
                "exercises_completed": count,
                "mistakes_pool": mistakes,
                "streak": u_data.get('streak', 0),
                "level": u_data.get('level', 1),
                "xp": u_data.get('xp', 0),
                "daily_gen_count": u_data.get('daily_gen_count', 0),
                
                # NOUS CAMPS
                "is_vip": is_vip_active, # Sobreescrivim el camp estàtic amb la lògica real
                "correction_credits": u_data.get('correction_credits', 0),
                "vip_expiry_date": vip_expiry.isoformat() if vip_expiry else None
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

    # --- CORE EXERCISE ---
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
            db = firestore.client()
            exercises_ref = db.collection('exercises')
            
            print(f"🔍 BUSCANT A DB: Level={level}, Type={exercise_type}")

            # INTENT 1: Cerca estàndard (pel camp exercise_type)
            query = exercises_ref.where("level", "==", level)\
                                 .where("exercise_type", "==", exercise_type)
            
            docs = list(query.stream())
            
            # INTENT 2: Si no en troba, potser el camp es diu 'type' o 'part_id' a la teva DB antiga?
            if not docs:
                print("⚠️ No trobats per 'exercise_type'. Provant per 'type'...")
                query = exercises_ref.where("level", "==", level)\
                                     .where("type", "==", exercise_type)
                docs = list(query.stream())

            # INTENT 3: Si encara no en troba, potser falta el camp i ho hem de buscar manualment
            if not docs:
                print("⚠️ No trobats per 'type'. Descarregant tot el nivell per inspeccionar (Debug)...")
                # Això és només per debug, no ho deixis en producció si tens milers d'exercicis
                all_level_docs = exercises_ref.where("level", "==", level).limit(20).stream()
                for d in all_level_docs:
                    data = d.to_dict()
                    # Comprovem si l'estructura és l'antiga (on el tipus era una clau del diccionari)
                    if exercise_type in data: 
                        docs.append(d)

            # Filtrem els que ja ha fet l'usuari
            available = []
            print(f"📄 Documents trobats bruts: {len(docs)}")
            
            for doc in docs:
                # Gestionem si 'doc' ja és un objecte o una referència
                data = doc.to_dict() if hasattr(doc, 'to_dict') else doc.to_dict()
                doc_id = doc.id
                
                # Normalitzem l'ID
                data['id'] = doc_id
                
                if doc_id not in completed_ids:
                    available.append(data)
                else:
                    print(f"   ❌ Saltant {doc_id} (Ja completat)")

            if not available:
                print("❌ 0 disponibles després de filtrar l'historial.")
                return None

            print(f"✅ DISPONIBLES REALS: {len(available)}")
            
            # Selecció aleatòria
            selected = random.choice(available)
            print(f"🎲 Random Select: {selected.get('id')} from {len(available)} options.")
            return selected

        except Exception as e:
            print(f"Error fetching exercise: {e}")
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

    @staticmethod
    def get_user_completed_ids(user_id: str) -> list:
        """Retorna una llista simple amb tots els IDs d'exercicis fets per l'usuari"""
        try:
            docs = db.collection("users").document(user_id).collection("completed_exercises").stream()
            return [doc.id for doc in docs]
        except Exception:
            return []
        
class DatabaseService:
    @staticmethod
    def save_exercise(exercise_data: dict):
        """Guarda un exercici a la col·lecció 'exercises'"""
        db = firestore.client()
        # Afegim un timestamp o ID si cal
        exercise_data["created_at"] = firestore.SERVER_TIMESTAMP
        # Guardem
        db.collection("exercises").add(exercise_data)

    @staticmethod
    def get_random_exercise(exercise_type: str, level: str = "C1"):
        """Busca un exercici del tipus correcte a la BD"""
        db = firestore.client()
        
        # Consultem exercicis d'aquest tipus
        # Nota: En producció, idealment marquem els 'usats' per no repetir.
        # Aquí fem un random simple per començar.
        docs = db.collection("exercises")\
                 .where("type", "==", exercise_type)\
                 .limit(10)\
                 .stream()
        
        exercises = [doc.to_dict() for doc in docs]
        
        if not exercises:
            return None
            
        return random.choice(exercises)