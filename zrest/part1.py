from .base import ExerciseGenerator

class Part1Generator(ExerciseGenerator):
    def get_prompt(self, level: str) -> str:
        return f"""
        You are an English teacher creating exercises for students at level {level} (C1).
        Generate ONE 'reading_and_use_of_language1' exercise in JSON format.

        Requirements:
        - The text must have 8 gaps, each marked as [1], [2], ..., [8].
        - For each gap, provide a question with 4 options (one correct).
        - Use clear, exam-like phrasing.
        - Ensure the exercise is challenging and suitable for C1 level.
        - The text should be at least 300 words long.

        Output JSON structure:
        {{
            "type": "reading_and_use_of_language1",
            "title": "Multiple Choice Cloze",
            "instructions": "For questions 1-8, read the text below and decide which answer (A, B, C or D) best fits each gap.",
            "text": "The text content with gaps like [1]...",
            "questions": [
                {{
                    "question": "1",
                    "options": [{{"text": "catch"}}, {{"text": "win"}}, {{"text": "achieve"}}, {{"text": "receive"}}],
                    "answer": "win",
                    "answer_type": "multiple_choice"
                }}
            ]
        }}
        """