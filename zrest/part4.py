from .base import ExerciseGenerator

class Part4Generator(ExerciseGenerator):
    def get_prompt(self, level: str) -> str:
        return f"""
        You are an English teacher creating exercises for students at level {level} (C1).
        Generate ONE 'reading_and_use_of_language4' (Key Word Transformation) exercise in JSON format.

        Requirements:
        - Create 6 questions numbered 25-30.
        - For each item provide:
          1. "original_sentence": The complete starting sentence.
          2. "second_sentence": The target sentence with a GAP.
          3. "keyword": The word in CAPITALS that must be used.
          4. "answer": The correct phrase (3-6 words) to fill the gap.
        - The text must be at least 300 words long.

        Output JSON structure:
        {{
            "type": "reading_and_use_of_language4",
            "title": "Key Word Transformation",
            "instructions": "For questions 25-30, complete the second sentence so that it has a similar meaning to the first sentence, using the word given. Do not change the word given. You must use between three and six words, including the word given.",
            "text": "",
            "questions": [
                {{
                    "question": "25",
                    "original_sentence": "James would only speak to the head of department alone.",
                    "second_sentence": "James _______________________ to the head of department alone.",
                    "keyword": "ON",
                    "answer": "insisted on speaking",
                    "answer_type": "short_answer"
                }}
            ]
        }}
        """