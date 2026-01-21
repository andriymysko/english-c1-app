from .base import ExerciseGenerator

class Part7Generator(ExerciseGenerator):
    def get_prompt(self, level: str) -> str:
        return f"""
        You are an English teacher creating a C1 Advanced 'Reading' (Part 7 - Gapped Text) exercise.
        Generate ONE exercise in JSON format.

        Requirements:
        1. Write a main text (approx 600 words) with 6 GAPS where paragraphs have been removed. Mark gaps strictly as [41], [42], [43], [44], [45], [46].
        2. Create 7 paragraphs labeled A, B, C, D, E, F, G.
           - 6 of them fit into the gaps.
           - 1 is a "distractor" (does not fit anywhere).
        3. Format the 'text' field to include the Main Text first, followed by a separator line, and then the "Missing Paragraphs" list.

        Output JSON structure:
        {{
            "type": "reading_and_use_of_language7",
            "title": "Part 7: Gapped Text",
            "instructions": "You are going to read an article. Six paragraphs have been removed. Choose from the paragraphs A-G the one which fits each gap (41-46). There is one extra paragraph which you do not need to use.",
            "text": "The main article starts here... suddenly there was a noise [41] ... and then it continued. \n\n --- MISSING PARAGRAPHS --- \n\n A: The noise was actually a cat... \n\n B: However, the door was locked... \n\n ...",
            "questions": [
                {{
                    "question": "41",
                    "answer": "A",
                    "answer_type": "short_answer"
                }},
                {{
                    "question": "42",
                    "answer": "C",
                    "answer_type": "short_answer"
                }},
                // ... continue to 46
                {{
                    "question": "46",
                    "answer": "F",
                    "answer_type": "short_answer"
                }}
            ]
        }}
        """