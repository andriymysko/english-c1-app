from .factory import ExerciseFactory
import uuid
import concurrent.futures

class ExamGenerator:
    @staticmethod
    def generate_full_exam(level: str = "C1"):
        """
        Genera un examen complet de Reading & Use of English (Parts 1 a 8).
        """
        # ARA SÍ: Totes les parts incloses
        exam_structure = [
            "reading_and_use_of_language1", # Multiple Choice Cloze
            "reading_and_use_of_language2", # Open Cloze (NOVA)
            "reading_and_use_of_language3", # Word Formation (NOVA)
            "reading_and_use_of_language4", # Key Word Transformation (NOVA)
            "reading_and_use_of_language5", # Multiple Choice Reading
            "reading_and_use_of_language6", # Cross-Text Matching
            "reading_and_use_of_language7", # Gapped Text
            "reading_and_use_of_language8"  # Multiple Matching
        ]
        
        parts = {}
        print("🎓 ExamGenerator: Generant les 8 parts en paral·lel...")

        # Funció auxiliar per a cada fil
        def generate_part(etype):
            try:
                print(f"   ▶️ Llançant {etype}...")
                # El factory ja sap com crear cadascun d'aquests tipus
                ex = ExerciseFactory.create_exercise(etype, level)
                return etype, ex.model_dump()
            except Exception as e:
                print(f"   ⚠️ Error a {etype}: {e}")
                return etype, None

        # Executem les 8 peticions simultàniament
        # Això és vital, si ho féssim un per un trigaria 4 minuts!
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future_to_type = {executor.submit(generate_part, t): t for t in exam_structure}
            
            for future in concurrent.futures.as_completed(future_to_type):
                etype, data = future.result()
                if data:
                    parts[etype] = data

        # Ordenem les parts en l'ordre correcte (1, 2, 3... 8)
        ordered_parts = []
        for t in exam_structure:
            if t in parts:
                ordered_parts.append(parts[t])

        return {
            "id": str(uuid.uuid4()),
            "title": f"Cambridge {level} Full Mock Exam",
            "duration_minutes": 90, # Temps oficial del paper
            "parts": ordered_parts
        }