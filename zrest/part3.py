from .base import ExerciseGenerator

class Part3Generator(ExerciseGenerator):
    def get_prompt(self, level: str) -> str:
        return f"""
        You are an English teacher creating exercises for students at level {level} (C1).
        Generate ONE 'reading_and_use_of_language3' (Word Formation) exercise in JSON format.

        Requirements:
        - The text must be about a coherent topic (approx 300 words).
        - The text must have 8 gaps, numbered 17-24 (standard Cambridge numbering for Part 3).
        - For each gap, provide the ROOT word in CAPITALS (e.g., "ATTRACT").
        - The answer must be the transformed word (e.g., "ATTRACTION").

        Output JSON structure:
        {{
            "type": "reading_and_use_of_language3",
            "title": "Word Formation",
            "instructions": "For questions 17-24, read the text below. Use the word given in capitals at the end of some of the lines to form a word that fits in the gap in the same line.",
            "text": "This is a text about [17] ...",
            "questions": [
                {{
                    "question": "17",
                    "keyword": "ATTRACT",
                    "answer": "attraction",
                    "answer_type": "short_answer"
                }}
            ]
        }}
        """