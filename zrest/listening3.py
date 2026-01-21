from .base import ExerciseGenerator

class Listening3Generator(ExerciseGenerator):
    def get_prompt(self, level: str) -> str:
        return f"""
        You are an English teacher creating a C1 Advanced 'Listening' (Part 3 - Multiple Choice) script.
        Generate ONE exercise in JSON format.

        Requirements:
        1. Write an INTERVIEW (approx 4 mins) involving an interviewer and two guests (or one expert).
        2. Put the full text in the 'text' field (labeled TAPESCRIPT).
        3. Create 6 multiple-choice questions (numbered 15-20) with 4 options (A, B, C, D).
        4. Questions should focus on attitude and opinion.

        Output JSON structure:
        {{
            "type": "listening3",
            "title": "Listening Part 3: Interview",
            "instructions": "You will hear an interview. For questions 15-20, choose the answer (A, B, C or D) which fits best.",
            "text": "--- TAPESCRIPT ---\\n\\nInterviewer: Welcome... Today we are talking to...",
            "questions": [
                {{
                    "question": "15",
                    "stem": "What is the expert's opinion on...?",
                    "options": [
                        {{"text": "A..."}}, 
                        {{"text": "B..."}}, 
                        {{"text": "C..."}}, 
                        {{"text": "D..."}}
                    ],
                    "answer": "A...",
                    "answer_type": "multiple_choice"
                }}
            ]
        }}
        """