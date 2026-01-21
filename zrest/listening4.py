from .base import ExerciseGenerator

class Listening4Generator(ExerciseGenerator):
    def get_prompt(self, level: str) -> str:
        return f"""
        You are an English teacher creating a C1 Advanced 'Listening' (Part 4 - Multiple Matching) script.
        Generate ONE exercise in JSON format.

        Requirements:
        1. Create 5 short monologues (Speaker 1-5) on a theme (e.g., "Starting a new job").
        2. Put the scripts in the 'text' field.
        3. Create 2 Tasks.
           - TASK 1 (Questions 21-25): e.g., "Why did they start?" (List A-H).
           - TASK 2 (Questions 26-30): e.g., "How do they feel now?" (List A-H).
        4. Include the Options Lists (A-H) in the 'text' field or instructions so the student can see them.

        Output JSON structure:
        {{
            "type": "listening4",
            "title": "Listening Part 4: Multiple Matching",
            "instructions": "You will hear five short extracts. Task 1: Choose from list A-H... Task 2: Choose from list A-H...",
            "text": "TASK 1 OPTIONS (Why?):\\nA: Money\\nB: Boredom\\nC: ...\\n\\nTASK 2 OPTIONS (Feeling?):\\nA: Excited\\nB: Regretful\\nC: ...\\n\\n--- TAPESCRIPT ---\\nSpeaker 1: ...",
            "questions": [
                {{
                    "question": "21",
                    "stem": "Speaker 1 (Task 1)",
                    "answer": "B",
                    "answer_type": "short_answer"
                }},
                 {{
                    "question": "26",
                    "stem": "Speaker 1 (Task 2)",
                    "answer": "A",
                    "answer_type": "short_answer"
                }}
            ]
        }}
        """