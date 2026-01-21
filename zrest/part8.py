from .base import ExerciseGenerator

class Part8Generator(ExerciseGenerator):
    def get_prompt(self, level: str) -> str:
        return f"""
        You are an English teacher creating a C1 Advanced 'Reading' (Part 8 - Multiple Matching) exercise.
        Generate ONE exercise in JSON format.

        Requirements:
        1. Write a text about a specific topic (e.g., "Career changes", "Extreme sports") divided into 4 sections labeled A, B, C, D.
           - Total length approx 500-600 words.
        2. Create 10 questions numbered 47 to 56.
           - Each question must be a statement like "Which person mentions being surprised by..." or "Which section mentions..."
        3. The answer to each question must be one of the letters (A, B, C, or D).

        Output JSON structure:
        {{
            "type": "reading_and_use_of_language8",
            "title": "Part 8: Multiple Matching",
            "instructions": "You are going to read an article divided into sections. For questions 47-56, choose from the sections (A-D). The sections may be chosen more than once.",
            "text": "CAREER CHANGES\n\nSection A\nI used to work in a bank...\n\nSection B\nMy experience was quite different...\n\nSection C\n...",
            "questions": [
                {{
                    "question": "47",
                    "stem": "Which person mentions feeling relieved after leaving their job?",
                    "answer": "A",
                    "answer_type": "short_answer"
                }},
                {{
                    "question": "48",
                    "stem": "Which person admits making a financial mistake?",
                    "answer": "C",
                    "answer_type": "short_answer"
                }}
            ]
        }}
        """