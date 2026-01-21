from .base import ExerciseGenerator

class Listening1Generator(ExerciseGenerator):
    def get_prompt(self, level: str) -> str:
        return f"""
        You are an English teacher creating a C1 Advanced 'Listening' (Part 1) script.
        Generate ONE exercise in JSON format.

        Requirements:
        1. Create 3 independent short extracts (approx 1 minute each).
           - Extract 1: Two people discussing a topic (e.g., a movie, a purchase).
           - Extract 2: Two people in a different setting.
           - Extract 3: Two people in a third setting.
        2. Put the full dialogue of all 3 extracts in the 'text' field, labeled clearly.
        3. Create 2 Multiple Choice questions (A, B, C) for EACH extract (Total 6 questions).

        Output JSON structure:
        {{
            "type": "listening1",
            "title": "Listening Part 1: Multiple Choice",
            "instructions": "You will hear three different extracts. For questions 1-6, choose the answer (A, B or C) which fits best according to what you hear.",
            "text": "--- TAPESCRIPT (DO NOT READ IF YOU ARE THE STUDENT) ---\\n\\nEXTRACT ONE\\nMan: ...\\nWoman: ...\\n\\nEXTRACT TWO\\n...\\n\\nEXTRACT THREE\\n...",
            "questions": [
                {{
                    "question": "1",
                    "stem": "What do they agree about regarding the movie?",
                    "options": [
                        {{"text": "Option A"}},
                        {{"text": "Option B"}},
                        {{"text": "Option C"}}
                    ],
                    "answer": "Option A",
                    "answer_type": "multiple_choice"
                }}
            ]
        }}
        """