from openai import OpenAI
import os
import json
from dotenv import load_dotenv

load_dotenv()

class ReviewGenerator:
    def __init__(self, mistakes: list, target_type: str):
        self.mistakes = mistakes
        self.target_type = target_type
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def generate(self, level: str):
        print(f"🔄 ReviewGenerator: Creant repàs per a {len(self.mistakes)} errors...")
        
        prompt = self.get_prompt(level)
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini", 
                messages=[{"role": "system", "content": prompt}],
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            data = json.loads(content)
            
            # Classe simple per compatibilitat amb el router
            class GenericExercise:
                def __init__(self, data):
                    self.data = data
                def model_dump(self):
                    return self.data
            
            return GenericExercise(data)

        except Exception as e:
            print(f"Error generating review: {e}")
            raise e

    def get_prompt(self, level: str) -> str:
        # 1. Extraiem les paraules CORRECTES que l'usuari havia d'haver posat
        target_words = []
        for m in self.mistakes:
            # Busquem on està la resposta bona
            word = m.get('correct_answer') or m.get('answer')
            if word:
                target_words.append(str(word))
        
        # Limitem a 8 paraules per no fer un text infinit
        keywords_str = ", ".join(target_words[:8])
        
        return f"""
        You are an expert Cambridge C1 English exam creator.
        
        GOAL: The student failed these specific words in the past: {keywords_str}.
        CREATE A "PART 1: MULTIPLE CHOICE CLOZE" text to help them practice these exact words in context.
        
        INSTRUCTIONS:
        1. Write a coherent text (approx 200 words).
        2. The text MUST have gaps [1], [2], etc. corresponding to the target words list provided above.
        3. If a word is impossible to fit, use a synonym, but try to use the original errors.
        4. For each gap, provide 4 options (A, B, C, D). 
           - One option MUST be the target word (Correct Answer).
           - The other 3 must be tricky distractors.
        
        JSON Structure:
        {{
            "type": "reading_and_use_of_language1",
            "title": "Personalized Review",
            "instructions": "Read the text below. These gaps correspond to mistakes you made previously.",
            "text": "Full text with gaps like [1]...",
            "questions": [
                {{
                    "question": "1",
                    "options": [ 
                        {{"text": "CorrectWord"}}, 
                        {{"text": "Distractor1"}}, 
                        {{"text": "Distractor2"}}, 
                        {{"text": "Distractor3"}} 
                    ],
                    "answer": "CorrectWord",
                    "explanation": "Contextual explanation."
                }}
            ]
        }}
        """