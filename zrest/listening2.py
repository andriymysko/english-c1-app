from .base import ExerciseGenerator

class Listening2Generator(ExerciseGenerator):
    def get_prompt(self, level: str) -> str:
        return f"""
        You are an English teacher creating a C1 Advanced 'Listening' (Part 2 - Sentence Completion) script.
        Generate ONE exercise in JSON format.

        Requirements:
        1. Write a MONOLOGUE (approx 3 mins) about a specific topic (e.g., "A career in archaeology", "Beekeeping").
        2. Put the full text in the 'text' field (labeled TAPESCRIPT).
        3. Create 8 sentences (numbered 7-14) summarizing the talk, each with a GAP.
        4. The answer must be a word or short phrase from the text (1-3 words).

        Output JSON structure:
        {{
            "type": "listening2",
            "title": "Listening Part 2: Sentence Completion",
            "instructions": "You will hear a student talking about [Topic]. For questions 7-14, complete the sentences with a word or short phrase.",
            "text": "--- TAPESCRIPT ---\\n\\nSpeaker: Hello everyone, today I want to share my experience about...",
            "questions": [
                {{
                    "question": "7",
                    "stem": "The student says that ________ was the most difficult part of the project.",
                    "answer": "finding resources",
                    "answer_type": "short_answer"
                }}
            ]
        }}
        """