from openai import OpenAI
import os
import json
from dotenv import load_dotenv

load_dotenv()

class VocabularyGenerator:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def generate_flashcards(self, mistakes):
        # Limitem a 12 errors recents
        recent_mistakes = mistakes[-12:] 
        
        error_context = []
        for m in recent_mistakes:
            answer = m.get('correct_answer') or m.get('answer')
            question = m.get('question') or m.get('stem') or "Unknown context"
            if answer:
                error_context.append(f"Target: {answer} | Context: {question}")

        if not error_context:
            return {"flashcards": []}

        # --- CANVI CLAU: ESTRUCTURA JSON EXPLÍCITA ---
        prompt = f"""
        You are a Cambridge C1 Vocabulary Coach.
        The student made mistakes on these concepts:
        {json.dumps(error_context)}

        ACTION: Create a study flashcard for each unique concept.
        
        CRITICAL OUTPUT RULES:
        1. "front": The target word or short phrase.
        2. "definition": A clear C1-level definition in English.
        3. "translation": The Spanish translation (Traducción).
        4. "example": A short example sentence using the word.
        5. "type": "Vocabulary", "Grammar", or "Collocation".
        6. "icon": An emoji.

        JSON Structure:
        {{
            "flashcards": [
                {{
                    "front": "Word",
                    "definition": "To do something...",
                    "translation": "Hacer algo...",
                    "example": "He decided to...",
                    "type": "Vocabulary",
                    "icon": "📘"
                }}
            ]
        }}
        """
        
        try:
            print(f"🃏 Generant flashcards estructurades per a {len(error_context)} errors...")
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": prompt}],
                temperature=0.6,
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"Error generating flashcards: {e}")
            return {"flashcards": []}