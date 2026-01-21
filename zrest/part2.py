from .base import ExerciseGenerator

class Part2Generator(ExerciseGenerator):
    def get_prompt(self, level: str) -> str:
        return f"""
        You are an English teacher creating exercises for students at level {level} (C1).
        Generate ONE 'reading_and_use_of_language2' (Open Cloze) exercise in JSON format.

        Requirements:
        - The text must be about a coherent topic (approx 300 words).
        - The text must have 8 gaps, marked strictly as [1], [2], ..., [8].
        - For each gap, the missing item must be exactly ONE word (grammar words like prepositions, articles, auxiliary verbs, etc.).
        - Do NOT provide options. The student must guess the word.

        Output JSON structure:
        {{
            "type": "reading_and_use_of_language2",
            "title": "Open Cloze",
            "instructions": "For questions 1-8, read the text below and think of the word which best fits each gap. Use only one word in each gap.",
            "text": "Here is the text with [1] gaps inside...",
            "questions": [
                {{
                    "question": "1",
                    "answer": "some_word",
                    "answer_type": "short_answer"
                }},
                // ... repeat for 2-8
            ]
        }}
        """