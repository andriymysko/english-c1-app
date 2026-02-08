from .factory import ExerciseFactory
from app.services.db import DatabaseService # <--- NECESSITEM ACCÉS A LA DB
import uuid
import concurrent.futures

class ExamGenerator:
    @staticmethod
    def generate_full_exam(user_id: str, level: str = "C1"):
        """
        Genera un examen complet (Parts 1-8) utilitzant lògica de POOL.
        1. Intenta buscar exercicis existents a la DB que l'usuari no hagi fet.
        2. Si no en troba, els genera amb IA al moment.
        """
        
        # 1. Recuperem l'historial de l'usuari per no repetir preguntes
        # Assumim que DatabaseService té un mètode per obtenir això, o ho fem manual:
        completed_ids = DatabaseService.get_user_completed_ids(user_id)
        
        exam_structure = [
            "reading_and_use_of_language1",
            "reading_and_use_of_language2",
            "reading_and_use_of_language3",
            "reading_and_use_of_language4",
            "reading_and_use_of_language5",
            "reading_and_use_of_language6",
            "reading_and_use_of_language7",
            "reading_and_use_of_language8"
        ]
        
        parts = {}
        print(f"🎓 ExamGenerator: Preparant examen per a {user_id}...")

        # Funció intel·ligent (SMART FETCH)
        def smart_fetch_part(etype):
            try:
                # PAS A: Mirem a la Piscina (DB) 🏊‍♂️
                existing = DatabaseService.get_existing_exercise(level, etype, completed_ids)
                
                if existing:
                    print(f"   ✨ REUTILITZAT (DB): {etype}")
                    return etype, existing
                
                # PAS B: Si no hi és, generem amb IA (Fàbrica) 🤖
                print(f"   ⚙️ GENERANT (IA): {etype}...")
                exercise_obj = ExerciseFactory.create_exercise(etype, level)
                exercise_data = exercise_obj.model_dump()
                
                # IMPORTANT: Guardem el nou exercici a la DB per al futur!
                # Així el pròxim usuari se'l trobarà al Pool.
                new_id = DatabaseService.save_exercise(exercise_data, level, etype, is_public=True)
                exercise_data['_id'] = new_id # Assegurem que té ID
                
                return etype, exercise_data

            except Exception as e:
                print(f"   ⚠️ Error processant {etype}: {e}")
                return etype, None

        # Execució en paral·lel (Threads)
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future_to_type = {executor.submit(smart_fetch_part, t): t for t in exam_structure}
            
            for future in concurrent.futures.as_completed(future_to_type):
                etype, data = future.result()
                if data:
                    parts[etype] = data

        # Ordenar resultats
        ordered_parts = []
        for t in exam_structure:
            if t in parts:
                ordered_parts.append(parts[t])

        return {
            "id": str(uuid.uuid4()),
            "title": f"Cambridge {level} Mock Exam (Smart Mix)",
            "duration_minutes": 90,
            "parts": ordered_parts
        }