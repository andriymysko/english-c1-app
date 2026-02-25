import random
from openai import OpenAI
import os
import json
from dotenv import load_dotenv

load_dotenv()

class ReviewGenerator:
    def __init__(self, mistakes: list):
        self.mistakes = mistakes
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.selected_mistakes = []

    def generate(self, level: str):
        print(f"🔄 ReviewGenerator: Creant examen de diagnòstic híbrid...")
        
        # 1. Seleccionem un màxim de 6 errors per evitar fatiga cognitiva
        self.selected_mistakes = random.sample(self.mistakes, min(6, len(self.mistakes)))
        
        # 2. Construïm el context rigorós pel Prompt
        mistakes_context = ""
        for i, m in enumerate(self.selected_mistakes):
            m_type = m.get('type', 'Unknown')
            m_stem = m.get('stem') or m.get('question', 'Unknown context')
            m_correct = m.get('correct_answer', 'Unknown')
            mistakes_context += f"- MISTAKE {i+1} (Original Type: {m_type}):\n  Original Context: {m_stem}\n  Target Answer Needed: {m_correct}\n\n"

        prompt = f"""
        You are an elite Cambridge C1/C2 tutor. Your task is to generate a "Dynamic Diagnostic Exam" for a student based on their past mistakes.
        
        PAST MISTAKES TO TARGET:
        {mistakes_context}
        
        INSTRUCTIONS:
        1. Generate EXACTLY {len(self.selected_mistakes)} questions. Each question must target ONE of the mistakes above.
        2. CRITICAL: Do NOT reuse the 'Original Context'. You must create a COMPLETELY NEW sentence/context that forces the student to use the exact same grammar rule or vocabulary word ('Target Answer Needed').
        
        QUESTION FORMATTING RULES:
        - Include the gap "________" in the 'question' field.
        - If the original mistake was Multiple Choice (Reading Part 1, Collocations, etc.), provide exactly 4 options (A, B, C, D) in the 'options' array.
        - If the original mistake was an open input (e.g., Word Formation), leave the 'options' array EMPTY []. Put the ROOT word in parentheses at the end of the question.
        - For Key Word Transformations (Part 4), format the 'question' field like this:
          "Rewrite using the keyword: [KEYWORD]. Original: [Sentence]. -> [New sentence with ________]"
          
        OUTPUT VALID JSON STRUCTURE:
        {{
            "type": "review_exam",
            "title": "Targeted Diagnostic Exam",
            "instructions": "Answer these questions specifically tailored to target your historical weak points.",
            "text": "",
            "questions": [
                {{
                    "question": "[The new sentence containing the gap ________]",
                    "options": ["Option A", "Option B", "Option C", "Option D"], 
                    "answer": "[The exact correct word/phrase]",
                    "explanation": "[Brief pedagogical explanation of the underlying rule]"
                }}
            ]
        }}
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o", # Utilitzem el model superior per garantir el format JSON híbrid
                messages=[{"role": "system", "content": prompt}],
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            data = json.loads(content)
            
            class GenericExercise:
                def __init__(self, data):
                    self.data = data
                def model_dump(self):
                    return self.data
            
            return GenericExercise(data)

        except Exception as e:
            print(f"Error generating dynamic review: {e}")
            raise e