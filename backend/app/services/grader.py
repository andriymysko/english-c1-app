import json
from openai import OpenAI
from app.core.config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

class CorrectionService:  # 👈 ABANS ES DEIA 'Grader'
    
    @staticmethod
    def grade_writing(task_prompt: str, user_text: str, level: str = "C1"):
        # --- MODIFICACIÓ PAS 2.1: DEMANAR MODEL ANSWER ---
        prompt = f"""
        You are a strict Cambridge English {level} examiner.
        
        TASK INSTRUCTIONS: "{task_prompt}"
        STUDENT ESSAY: "{user_text}"
        
        ACTION:
        1. Grade the essay based on the official Cambridge scale (0-5 per criteria): 
           - Content
           - Communicative Achievement
           - Organization
           - Language
        2. Provide specific feedback and corrections.
        3. CRITICAL: Write a "MODEL ANSWER". This should be a perfect {level} level essay (approx 220-260 words) responding to the same task, so the student can learn by example.
        
        Output valid JSON only:
        {{
            "content_score": 0-5,
            "communicative_score": 0-5,
            "organization_score": 0-5,
            "language_score": 0-5,
            "score": 0-20,  <-- Sum of the above
            "feedback": "General feedback on strengths and weaknesses...",
            "corrections": [
                {{
                    "original": "error phrase",
                    "correction": "corrected phrase",
                    "explanation": "Grammar/Vocab reason"
                }}
            ],
            "model_answer": "Here write the full text of the perfect example essay..."
        }}
        """
        return CorrectionService._call_ai(prompt)

    @staticmethod
    def grade_speaking(task_prompt: str, transcript_text: str, level: str = "C1"):
        prompt = f"""
        You are a Cambridge English {level} ORAL examiner.
        
        TASK: "{task_prompt}"
        STUDENT TRANSCRIPT (Speech-to-text): "{transcript_text}"
        
        Analyze this spoken response. 
        NOTE: Since this is a transcript, ignore minor punctuation errors. Focus on:
        - Grammatical range and accuracy.
        - Vocabulary diversity.
        - Discourse management (coherence, connectors).
        
        Output valid JSON only:
        {{
            "score": 14, 
            "feedback": "Feedback on fluency and vocabulary usage...",
            "corrections": [
                {{
                    "original": "unnatural phrasing",
                    "correction": "more natural C1 phrasing",
                    "explanation": "Why this sounds better"
                }}
            ],
            "model_answer": "Write a short paragraph of how a native speaker would answer this question perfectly."
        }}
        """
        return CorrectionService._call_ai(prompt)

    @staticmethod
    def _call_ai(prompt):
        try:
            response = client.chat.completions.create(
                model="gpt-4o",  # Recomano gpt-4o per corregir millor, si vols estalviar posa gpt-4o-mini
                messages=[{"role": "system", "content": prompt}],
                temperature=0.4, # Temperatura baixa per a correccions consistents
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"Error calling AI Grader: {e}")
            # Retornem una estructura d'error segura per no trencar el frontend
            return {
                "score": 0,
                "feedback": "There was an error processing the correction. Please try again.",
                "corrections": [],
                "model_answer": "Error generating model answer."
            }