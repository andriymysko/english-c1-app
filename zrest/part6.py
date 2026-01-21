from .base import ExerciseGenerator

class Part6Generator(ExerciseGenerator):
    def get_prompt(self, level: str) -> str:
        return f"""
        You are an English teacher creating a C1 Advanced 'Reading' (Part 6 - Cross-Text Multiple Matching) exercise.
        Generate ONE exercise in JSON format.

        Requirements:
        1. Write 4 short texts (approx 100-150 words each) labeled A, B, C, and D. They must be about the SAME topic (e.g., reviews of a book, opinions on technology) but express different views.
        2. Combine these 4 texts into the single "text" field, separated by newlines.
        3. Create 4 questions numbered 37 to 40.
        4. The questions must be about comparing opinions (e.g., "Which writer shares Writer A's opinion on X?", "Which writer expresses a different view from the others regarding Y?").
        5. The options for every question are always A, B, C, D.

        Output JSON structure:
        {{
            "type": "reading_and_use_of_language6",
            "title": "Part 6: Cross-Text Multiple Matching",
            "instructions": "You are going to read four reviews of a book. For questions 37-40, choose from the reviews A-D. The reviews may be chosen more than once.",
            "text": "Review A\\nThis book is amazing...\\n\\nReview B\\nI completely disagree with A...\\n\\nReview C\\n...",
            "questions": [
                {{
                    "question": "37",
                    "stem": "Which writer shares Writer A's opinion regarding the main character?",
                    "options": [
                        {{"text": "Writer A"}},
                        {{"text": "Writer B"}},
                        {{"text": "Writer C"}},
                        {{"text": "Writer D"}}
                    ],
                    "answer": "Writer B",
                    "answer_type": "multiple_choice"
                }}
            ]
        }}
        """