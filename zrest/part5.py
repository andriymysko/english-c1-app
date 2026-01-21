from .base import ExerciseGenerator

class Part5Generator(ExerciseGenerator):
    def get_prompt(self, level: str) -> str:
        return f"""
        You are an English teacher creating C1 Reading Comprehension exercises.
        Generate ONE 'reading_and_use_of_language5' exercise in JSON format.

        Requirements:
        1. Generate a decent text (approx 600 words) suitable for C1 level reading. Title it "Stimulus".
        2. Create 6 multiple-choice questions numbered 31 to 36 based on the text.
        3. Each question must have a "stem" (the question text) and 4 "options" (A, B, C, D).

        Output JSON structure:
        {{
            "type": "reading_and_use_of_language5",
            "title": "Part 5: Multiple Choice Reading",
            "instructions": "You are going to read an extract from a book. For questions 31-36, choose the answer (A, B, C or D) which you think fits best according to the text.",
            "text": "Here goes the long reading text...",
            "questions": [
                {{
                    "question": "31",
                    "stem": "What is the writer's main point in the first paragraph?",
                    "options": [
                        {{"text": "Option A text"}},
                        {{"text": "Option B text"}},
                        {{"text": "Option C text"}},
                        {{"text": "Option D text"}}
                    ],
                    "answer": "Option A text",
                    "answer_type": "multiple_choice"
                }}
            ]
        }}
        """